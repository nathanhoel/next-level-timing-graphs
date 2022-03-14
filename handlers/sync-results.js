const uuid = require('uuid');
const AWS = require('aws-sdk');
const request = require('request-promise');
const { sendMessage } = require('../lib/slack');
const { msToTimeFormat } = require('../lib/time');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();
const TABLE_NAME = `${process.env.STAGE}-nlt-results-v2`;
const RACE_ID = 'df9fb2b0-1151-4048-aa99-8252517ef78e';
const UNSET_RACER_NAMES = ['88025', '88707', 'Racer not assigned'];

module.exports.handle = async function (event, context, callback) {
  await _doSync(callback, false);
}

module.exports.poll = async function (event, context, callback) {
  await _timeout(60000);
  await _doSync(callback, true);
}

async function _doSync(callback, isPolling) {
  const races = await request({
    method: 'GET',
    uri: 'https://nextleveltiming.com/api/races?filter[community_id]=19',
    json: true,
  });

  const raceId = races.data[0].id;

  var racesAdded = 0;
  if (await _parseRace(raceId, isPolling)) {
    racesAdded++;
  }

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      racesAdded: racesAdded
    }),
  });
}

function _timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function _parseRace(raceId, isPolling) {
  const race = await _validateRace(raceId, isPolling);
  if (!race) { return false; }

  //let [, name, rawTotalLaps, , rawTotalTime, rawFastestLap, , , ...rawLaps] = rawResult.split(/\n/g);
  const racer = race.participants[0];
  const name = racer.racer_name;
  const totalTime = racer.elapsed_time;
  const laps = _getLaps(race.events, race.minimum_lap_time);
  const totalLaps = racer.laps;
  const totalLapTime = laps.reduce((total, cur) => total + cur, 0);
  const startTime = totalTime - totalLapTime;

  const result = {
    id: raceId.toString(),
    createdAt: new Date(race.created_at).toISOString(),
    race: RACE_ID,
    sortKey: `${name}_${(10000 - totalLaps).toString().padStart(5, '0')}_${totalTime.toString().padStart(10, '0')}`,
    name,
    totalLaps,
    totalTime,
    fastestLap: racer.fast_lap,
    laps,
  };

  if (startTime > 1) {
    laps.unshift(startTime);
    result.startTime = startTime;
  }

  // await _triggerSlackIntegration(result);
  await _storeResult(result);

  return true;
}

async function _validateRace(raceId, isPolling) {
  var race = (await request({
    method: 'GET',
    uri: `https://nextleveltiming.com/api/races/${raceId}`,
    json: true,
  })).data;

  // check valid
  if (
    race.participants.length !== 1
    || race.race_format.time !== 180000
    || race.race_format.mode !== 'race'
  ) {
    return false;
  }

  if (
    UNSET_RACER_NAMES.includes(race.participants[0].racer_name)
    || race.status !== 'complete'
  ) {
    if (isPolling) {
      throw `Race ${raceId} is not complete or has no racer name`;
    }
    await lambda.invoke({
      FunctionName: 'next-level-timing-graphs-production-pollResults',
      InvocationType: 'Event',
    }).promise();
    return false;
  }

  return race;
}

function _getLaps(rawLaps, minimumLapTime) {
  const laps = [];
  var lastRaceTime = 0;
  for (const rawLap of rawLaps) {
    if (rawLap.type !== 'racer_passed_sector') { continue; }

    const lapTime = rawLap.race_time - lastRaceTime;

    // initialize first lap
    if (lastRaceTime === 0 && laps.length === 0) {
      lastRaceTime = rawLap.race_time;
      continue;
    }

    // skip invalid laps
    if (lapTime < minimumLapTime) {
      continue;
    }

    // record lap
    lastRaceTime = rawLap.race_time;
    laps.push(lapTime);
  }

  return laps;
}

function _timeStringToMS(duration) {
  return parseInt((duration.split(':').reduce((acc, time) => (60 * acc) + +time) * 1000).toFixed(0));
}

async function _triggerSlackIntegration(newResult) {
  const query = await dynamoDb.query({
    TableName: TABLE_NAME,
    IndexName: 'raceIndex',
    KeyConditionExpression: 'race = :hkey',
    ExpressionAttributeValues: {
      ':hkey': RACE_ID,
    }
  }).promise();
  const allPastResults = query.Items;

  const personalPastResults = allPastResults.filter(result => result.name === newResult.name);
  const { name, fastestLap } = newResult;

  if (allPastResults.length === 0) {
    await sendMessage(`:siren: *${name}* just recorded the very first time for the current race!\n ${_resultTimeText(newResult)}\n ${_resultLinkText(newResult)}`);
    return;
  }

  const isBestResult = allPastResults.length !== personalPastResults.length && _isBestResult(newResult, allPastResults);
  if (isBestResult) {
    await sendMessage(`:siren: *${name}* just took over first place!\n ${_resultTimeText(newResult)}\n ${_resultLinkText(newResult)}`);
  }

  const isBestLap = allPastResults.length !== personalPastResults.length && _isBestLap(newResult, allPastResults);
  if (isBestLap) {
    await sendMessage(`:siren: *${name}* just beat the overall fastest lap!\n *${msToTimeFormat(fastestLap)}* seconds\n ${_resultLinkText(newResult)}`);
  }

  if (personalPastResults.length === 0) {
    await sendMessage(`:siren: *${name}* just recorded their first time!\n ${_resultTimeText(newResult)}\n fastest lap *${msToTimeFormat(fastestLap)}* seconds\n ${_resultLinkText(newResult)}`);
    return;
  }

  if (!isBestResult && _isPersonalBestResult(newResult, personalPastResults)) {
    await sendMessage(`:siren: *${name}* just beat their personal best time!\n ${_resultTimeText(newResult)}\n ${_resultLinkText(newResult)}`);
  }

  if (!isBestLap && _isPersonalBestLap(newResult, personalPastResults)) {
    await sendMessage(`:siren: *${name}* just beat their personal fastest lap!\n *${msToTimeFormat(fastestLap)}* seconds\n ${_resultLinkText(newResult)}`);
  }
}

async function _storeResult(result) {
  const params = {
    TableName: TABLE_NAME,
    Item: result,
  };

  console.log(params);

  return dynamoDb.put(params).promise();
}

function _resultTimeText(result) {
  const { totalLaps, totalTime } = result;
  return `*${totalLaps}* laps in *${msToTimeFormat(totalTime, true)}*`;
}

function _resultLinkText(result) {
  return `<https://3tmw38jjg8.execute-api.us-east-1.amazonaws.com/production/races/${RACE_ID}|All Results>`;
}

function _isPersonalBestResult(newResult, personalPastResults) {
  return _timeSortKey(newResult) < _bestTimeSortKey(personalPastResults);
}

function _isPersonalBestLap(newResult, personalPastResults) {
  return newResult.fastestLap < _bestLap(personalPastResults);
}

function _isBestResult(newResult, allPastResults) {
  return _timeSortKey(newResult) < _bestTimeSortKey(allPastResults);
}

function _isBestLap(newResult, allPastResults) {
  return newResult.fastestLap < _bestLap(allPastResults);
}

function _bestTimeSortKey(results) {
  return results.map(result => _timeSortKey(result)).sort()[0];
}

function _timeSortKey(result) {
  return result.sortKey.replace(`${result.name}_`, '');
}

function _bestLap(results) {
  return Math.min.apply(Math, results.map(result => result.fastestLap));
}

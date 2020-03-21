const uuid = require('uuid');
const AWS = require('aws-sdk');
const { sendMessage } = require('../lib/slack');
const { msToTimeFormat } = require('../lib/time');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-nlt-results`;
const RACE_ID = '93c856b2-027a-40f6-b06d-ee0c90068643';

module.exports.handle = async function (event, context, callback) {
  const timestamp = new Date().toISOString();
  const { body } = event;
  if (typeof body !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: '"data" must be set',
    });
    return;
  }

  const rawData = Buffer.from(body, 'base64').toString('utf-8')

  console.log(rawData);

  const query = await dynamoDb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'race = :hkey',
    ExpressionAttributeValues: {
      ':hkey': RACE_ID,
    }
  }).promise();
  const allPastResults = query.Items;

  // split the results into header and sets
  var [rawHeaders, ...rawResults] = rawData
    .replace(/\n\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/g);

  const results = [];
  for (const rawResult of rawResults) {
    let [, name, totalLaps, , rawTotalTime, rawFastestLap, , , ...rawLaps] = rawResult.split(/\n/g);

    if (rawLaps.length === 1 && rawLaps.split(' ').length > 3) {
      console.error('All Laps not Showing');
      callback(null, {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Must show all laps!',
      });
      return;
    }

    const totalTime = _timeStringToMS(rawTotalTime);
    const laps = rawLaps.filter(rawLap => !!rawLap).map((rawLap) => _timeStringToMS(rawLap.split(' ')[1]));
    const totalLapTime = laps.reduce((total, cur) => total + cur, 0);
    const startTime = totalTime - totalLapTime;

    const result = {
      id: uuid.v4(),
      createdAt: timestamp,
      race: RACE_ID,
      sortKey: `${name}_${(10000 - parseInt(totalLaps)).toString().padStart(5, '0')}_${_timeStringToMS(rawTotalTime).toString().padStart(10, '0')}`,
      name,
      totalLaps,
      totalTime,
      fastestLap: _timeStringToMS(rawFastestLap),
      laps,
    };

    if (startTime > 1) {
      laps.unshift(startTime);
      result.startTime = startTime;
    }

    _triggerSlackIntegration(result, allPastResults);

    results.push(result);
  }

  for (const result of results) {
    const params = {
      TableName: TABLE_NAME,
      Item: result,
    };

    console.log(params);

    await dynamoDb.put(params).promise();
  };

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(results),
  });
}

function _timeStringToMS(duration) {
  return parseInt((duration.split(':').reduce((acc, time) => (60 * acc) + +time) * 1000).toFixed(0));
}

function _triggerSlackIntegration(newResult, allPastResults) {
  const personalPastResults = allPastResults.filter(result => result.name === newResult.name);
  const { name, fastestLap, totalTime, totalLaps } = newResult;

  if (allPastResults.length === 0) {
    await sendMessage(`*${name}* just recorded the very first time for the current race!\n ${_resultText(newResult)}`);
    return;
  }

  const isBestResult = _isBestResult(newResult, allPastResults);
  if (allPastResults.length !== personalPastResults.length && isBestResult) {
    await sendMessage(`*${name}* just took over first place!\n ${_resultText(newResult)}`);
  }

  const isBestLap = _isBestLap(newResult, allPastResults);
  if (allPastResults.length !== personalPastResults.length && isBestLap) {
    await sendMessage(`*${name}* just beat the overall fastest lap!\n *${msToTimeFormat(fastestLap)} s`);
  }

  if (personalPastResults.length === 0) {
    await sendMessage(`*${name}* just recorded their first time!\n ${_resultText(newResult)}`);
    return;
  }

  if (!isBestResult && _isPersonalBestResult(newResult, personalPastResults)) {
    await sendMessage(`*${name}* just beat their personal best time!\n ${_resultText(newResult)}`);
  }

  if (!isBestLap && _isPersonalBestLap(newResult, personalPastResults)) {
    await sendMessage(`*${name}* just beat their personal fastest lap!\n *${msToTimeFormat(fastestLap)} s`);
  }
}

function _resultText(result) {
  const { totalLaps, totalTime } = result;
  return `*${totalLaps}* laps in *${msToTimeFormat(totalTime, true)}*`;
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
  return Math.min.apply(Math, results.map(result => _timeSortKey(result)));
}

function _timeSortKey(result) {
  return result.sortKey.replace(`${result.name}_`, '');
}

function _bestLap(results) {
  return Math.min.apply(Math, results.map(result => result.fastestLap));
}

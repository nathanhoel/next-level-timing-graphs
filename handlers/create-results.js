const uuid = require('uuid');
const AWS = require('aws-sdk');

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

  console.log(body);
  
  const rawData = Buffer.from(body, 'base64').toString('utf-8')
  
  console.log(rawData);
  
  // split the results into header and sets
  var [rawHeaders, ...rawResults] = rawData
    .replace(/\n\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/g);

  console.log(rawResults);
  
  const results = [];
  for (const rawResult of rawResults) {
    let [, name, totalLaps, , rawTotalTime, rawFastestLap, , , ...rawLaps] = rawResult.split(/\n/g);

    console.log(rawResult);
    
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

    if (startTime > 10) {
      laps.unshift(startTime);
      result.startTime = startTime;
    }

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

  const response = {
    statusCode: 200,
    body: JSON.stringify(results),
  };

  callback(null, response);
}

function _timeStringToMS(duration) {
  return parseInt((duration.split(':').reduce((acc, time) => (60 * acc) + +time) * 1000).toFixed(0));
}

const uuid = require('uuid');
const AWS = require('aws-sdk');
const bs58 = require('bs58');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handle = async (event, context, callback) => {
  const timestamp = new Date().toISOString();
  console.log(event);
  const body = JSON.parse(event.body);
  if (typeof body.data !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: '"data" must be set',
    });
    return;
  }

  const dataBytes = require('bs58').decode(body.data);
  const rawData = dataBytes.toString('utf8');

  // split the results into header and sets
  var [rawHeaders, ...rawResults] = rawData
    .replace(/\n\r/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/g);


  console.log(rawResults);

  const results = [];
  for (const rawResult of rawResults) {
    let [, name, totalLaps, , totalTime, fastestLap, , , ...rawLaps] = rawResult.split(/\n/g);
    results.push({
      id: uuid.v4(),
      createdAt: timestamp,
      name,
      sortKey: `${(10000 - parseInt(totalLaps)).toString().padStart(5, '0')}_${_timeStringToMS(totalTime).toString().padStart(10, '0')}`,
      totalLaps,
      totalTime: _timeStringToMS(totalTime),
      fastestLap: _timeStringToMS(fastestLap),
      laps: rawLaps.map((rawLap) => _timeStringToMS(rawLap.split(' ')[1])),
    });
  }
  console.log(results);

  for (const result of results) {
    const params = {
      TableName: 'nlt-results',
      Item: result,
    };

    await dynamoDb.put(params).promise();

    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
    };
    callback(null, response);
  };
}

function _timeStringToMS(duration) {
  return (duration.split(':').reduce((acc, time) => (60 * acc) + +time) * 1000).toFixed(0);
}

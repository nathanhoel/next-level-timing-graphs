const AWS = require('aws-sdk');
const headTag = require('../common/head-tag');
const header = require('../common/header');
const getResultsTable = require('../common/results-table');
const getResultsGraph = require('../common/results-graph');
const getLapTable = require('../common/lap-table');
const {
  getDriverBestResults,
  accumalteLaps,
  rankLaps,
  sortByPlace,
} = require('../common/data-helpers');


const dynamoDb = new AWS.DynamoDB.DocumentClient();
const RESULTS_TABLE_NAME = `${process.env.STAGE}-nlt-results-v2`;
const RACES_TABLE_NAME = `${process.env.STAGE}-races`;

module.exports.handle = async function (event, context, callback) {
  const race = (await dynamoDb.get({
    TableName : RACES_TABLE_NAME,
    Key: { HashKey: event.pathParameters.id }
  }).promise()).Item;

  const query = await dynamoDb.query({
    TableName: RESULTS_TABLE_NAME,
    IndexName: 'raceIndex',
    KeyConditionExpression: 'race = :hkey',
    ExpressionAttributeValues: {
      ':hkey': race.id,
    }
  }).promise();
  const allResults = query.Items;

  const bestResults = getDriverBestResults(allResults);
  accumalteLaps(bestResults);
  rankLaps(bestResults);
  sortByPlace(bestResults);

  const maxLaps = Math.max.apply(Math, bestResults.map(result => result.laps.length));
  const fastestLap = Math.min.apply(Math, bestResults.map(result => result.fastestLap));
  const overallFastestLap = Math.min.apply(Math, bestResults.map(result => result.overallFastestLap));

  const html = `
  <html>
    ${headTag}
    <body>
      ${header}

      <div id="title">
        <h2><a href="https://3tmw38jjg8.execute-api.us-east-1.amazonaws.com/production/races">Races</a> > ${race.name}</h2>
      </div>

      ${getResultsTable(bestResults, fastestLap, overallFastestLap, race)}

      ${getResultsGraph(race, bestResults, maxLaps)}

      ${getLapTable(bestResults, fastestLap)}
    </body>
  </html>`;

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: html,
  };

  callback(null, response);
};

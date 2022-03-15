const AWS = require('aws-sdk');
const headTag = require('../common/head-tag');
const header = require('../common/header');
const getResultsTable = require('../common/results-table');
const getResultsGraph = require('../common/results-graph');
const {
  accumalteLaps,
  rankLaps,
  sortByPlace,
} = require('../common/data-helpers');


const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-nlt-results-v2`;

module.exports.handle = async function (event, context, callback) {
  const race = {
    id: event.pathParameters.id,
    length: 180000,
  };

  const query = await dynamoDb.query({
    TableName: TABLE_NAME,
    IndexName: 'raceIndex',
    KeyConditionExpression: 'race = :hkey and begins_with(sortKey, :nam)',
    ExpressionAttributeValues: {
      ':hkey': race.id,
      ':nam': decodeURI(event.pathParameters.name),
    }
  }).promise();
  const allResults = query.Items;

  console.log(event.pathParameters.name);
  console.log(allResults);

  const bestResults = allResults;
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

      <div>
        Race: Title Here
      </div>

      ${getResultsTable(bestResults, fastestLap, overallFastestLap, race, false)}

      ${getResultsGraph(race, bestResults, maxLaps, false)}
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

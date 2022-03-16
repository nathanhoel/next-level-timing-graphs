const AWS = require('aws-sdk');
const headTag = require('../common/head-tag');
const header = require('../common/header');
const getResultsTable = require('../common/results-table');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-races`;

module.exports.handle = async function (event, context, callback) {
  // const query = await dynamoDb.query({
  //   TableName: TABLE_NAME,
  //   IndexName: 'typeIndex',
  //   KeyConditionExpression: 'type = :hkey',
  //   ExpressionAttributeValues: {
  //     ':hkey': 'time-trial',
  //   }
  // }).promise();
  // const allResults = query.Items;

  // const bestResults = getDriverBestResults(allResults);
  // accumalteLaps(bestResults);
  // rankLaps(bestResults);
  // sortByPlace(bestResults);

  // const maxLaps = Math.max.apply(Math, bestResults.map(result => result.laps.length));
  // const fastestLap = Math.min.apply(Math, bestResults.map(result => result.fastestLap));
  // const overallFastestLap = Math.min.apply(Math, bestResults.map(result => result.overallFastestLap));

  const html = `
  <html>
    ${headTag}
    <body>
      ${header}

      <div id="title">
        <h2>Races</h2>
      </div>

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

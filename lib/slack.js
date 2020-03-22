const request = require('request-promise');

exports.sendMessage = async function (message) {
  await request({
    method: 'POST',
    uri: process.env.SLACK_WEBHOOK,
    body: {
      text: message
    },
    json: true,
  });
}

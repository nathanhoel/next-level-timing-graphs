const request = require('request-promise');

exports.sendMessage = async function (message) {
  await request({
    method: 'POST',
    uri: 'https://hooks.slack.com/services/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',
    body: {
      text: message
    },
    json: true,
  });
}

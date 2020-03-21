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

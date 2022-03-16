const { msToTimeFormat } = require('../lib/time');

module.exports = function (races) {
  return `
    <div style="margin-top: 20px;">
      <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 60%">Race</th>
            <th scope="col" style="width: 20%">Start Date</th>
            <th scope="col" style="width: 20%">Track Layout</th>
          </tr>
        </thead>
        <tbody>
          ${races.map((race, index) => _raceRow(race)).join('')}
        </tbody>
      </table>
    </div>
  `;
};

function _raceRow(race) {
  return `
    <tr>
      <th scope="row">
        <div class="driver-name">
          <a href="https://3tmw38jjg8.execute-api.us-east-1.amazonaws.com/production/races/${race.id}">${race.name}</a>
        </div>
      </th>
      <td class="stat-break">${new Date(result.createdAt).toLocaleString('en-US', {timeZone: "America/New_York"})}</td >
      <td class="stat-break"><a href="https://nextleveltiming.com/communities/binsentry-raceway/track-layouts/${race.nltTrackLayoutId}" target="_blank">Track Layout</a></td>
    </tr>
  `;
}

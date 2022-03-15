const { msToTimeFormat } = require('../lib/time');

module.exports = function (bestResults, fastestLap, overallFastestLap) {
  return `
    <div style="margin-top: 50px;">
      <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 50%">Driver</th>
            <th scope="col" style="width: 20%">Lap / Time</th>
            <th scope="col" style="width: 10%">Fastest</th>
            <th scope="col" style="width: 10%">Average</th>
            <th scope="col" style="width: 10%">Overall Fastest</th>
          </tr>
        </thead>
        <tbody>
          ${bestResults.map((result, index) => _resultRow(result, index + 1, fastestLap, overallFastestLap)).join('')}
        </tbody>
      </table>
    </div>
  `;
};

function _resultRow(result, place, fastestLap, overallFastestLap) {
  return `
    <tr>
      <th scope="row">
        <div class="position-outer">
          <div class="position-border-box"></div>
          <span class="position-text">${place}</span>
        </div>
        <div class="driver-name">${result.name}</div>
      </th>
      <td class="stat-break">${result.totalLaps}L ${msToTimeFormat(result.totalTime, true)}</td >
      <td class="${fastestLap === result.fastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.fastestLap)}</td>
      <td class="stat-break">${msToTimeFormat(Math.floor((result.totalTime - (result.startTime || 0)) / result.totalLaps))}</td>
      <td class="${overallFastestLap === result.overallFastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.overallFastestLap)}</td>
    </tr>
  `;
}

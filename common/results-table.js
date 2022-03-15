const { msToTimeFormat } = require('../lib/time');

module.exports = function (results, fastestLapInResults, overallFastestLap, isMultipleDrivers = true) {
  return `
    <div style="margin-top: 50px;">
      <table class="table table-striped">
        <thead>
          <tr>
            <th scope="col" style="width: 50%">Driver</th>
            <th scope="col" style="width: 20%">Lap / Time</th>
            <th scope="col" style="width: 10%">Fastest</th>
            <th scope="col" style="width: 10%">Average</th>
            ${isMultipleDrivers ? '<th scope="col" style="width: 10%">Overall Fastest</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${results.map((result, index) => _resultRow(result, index + 1, fastestLapInResults, overallFastestLap, isMultipleDrivers)).join('')}
        </tbody>
      </table>
    </div>
  `;
};

function _resultRow(result, place, fastestLapInResults, overallFastestLap, isMultipleDrivers) {
  return `
    <tr>
      <th scope="row">
        <div class="position-outer">
          <div class="position-border-box"></div>
          <span class="position-text">${place}</span>
        </div>
        <div class="driver-name">${isMultipleDrivers ? result.name : new Date(result.createdAt).toLocaleString('en-US') }</div>
      </th>
      <td class="stat-break">${result.totalLaps}L ${msToTimeFormat(result.totalTime, true)}</td >
      <td class="${fastestLapInResults === result.fastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.fastestLap)}</td>
      <td class="stat-break">${msToTimeFormat(Math.floor((result.totalTime - (result.startTime || 0)) / result.totalLaps))}</td>
      ${isMultipleDrivers ?
        `<td class="${overallFastestLap === result.overallFastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.overallFastestLap)}</td>`
        : ''
      }
    </tr>
  `;
}

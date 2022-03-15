const { msToTimeFormat } = require('../lib/time');

module.exports = function (bestResults, fastestLap) {
  return `
    <div style="margin-top: 50px; overflow-x: auto;">
      ${_lapTable(bestResults, fastestLap)}
    </div>
  `;
}

function _lapTable(results, fastestLap) {
  const headers = results.map(result => `<th scope="col">${result.name}</th>`);
  const rows = results[0].rankedLaps
    .map((lap, index) => ({ lapNum: lap.lapNum, index }))
    .filter(lap => lap.lapNum !== '')
    .map(lap => _lapRow(results, lap, fastestLap));

  return `
    <table class="table table-striped">
      <thead>
        <tr>
          <th scope="col">Lap</th>
          ${headers.join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function _lapRow(results, { lapNum, index }, fastestLap) {
  const lapColumns = results.map(result => {
    const currentLap = result.rankedLaps[index];

    if (currentLap) {
      return `
        <td>
          <div class="lap-table-position">${currentLap.position}</div>
          <div class="lap-table-time ${currentLap.lapTime === result.fastestLap ? 'personal-fastest-lap' : ''} ${currentLap.lapTime === fastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(currentLap.lapTime)}</div>
        </td>
      `;
    }

    return '<td></td>';
  });
  return `
    <tr>
      <th scope="row">${lapNum}</th>
      ${lapColumns.join('')}
    </tr>
  `;
}

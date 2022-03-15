
module.exports = {
  getDriverBestResults: _getDriverBestResults,
  accumalteLaps: _accumalateLaps,
  rankLaps: _rankLaps,
  sortByPlace: _sortByPlace,
};

function _getDriverBestResults(results) {
  const bestResults = [];
  for (let i = 0; i < results.length; i++) {
    // if this is the first driver or the next driver in the result set, initialize variables
    if (i === 0 || results[i].name !== results[i - 1].name) {
      const bestResult = results[i];
      bestResult.overallFastestLap = bestResult.fastestLap; // init the overall fastest lap
      bestResults.push(results[i]); // first result for each driver is the best one
    }

    // if there is a faster lap in one of the worse results, record that
    const currentBestResult = bestResults[bestResults.length - 1];
    if (results[i].fastestLap < currentBestResult.overallFastestLap) {
      currentBestResult.overallFastestLap = results[i].fastestLap;
    }
  }
  return bestResults;
}

// get the race time for each lap
function _accumalateLaps(results) {
  for (const result of results) {
    const accumalatedLaps = [];
    for (let i = 0; i < result.laps.length; i++) {
      accumalatedLaps[i] = (accumalatedLaps[i - 1] || 0) + result.laps[i];
    }
    result.accumalatedLaps = accumalatedLaps;
  }
}

function _rankLaps(results) {
  const maxLaps = Math.max.apply(Math, results.map(result => result.laps.length));
  for (const result of results) {
    result.rankedLaps = [];
  }

  for (let lapNum = 0; lapNum < maxLaps; lapNum++) {
    const thisLapForAllDrivers = [];
    for (const result of results) {
      const time = result.accumalatedLaps[lapNum];
      if (!time) {
        continue;
      }

      const rankedLap = { time, lapTime: result.laps[lapNum], lapNum: !!result.startTime ? lapNum : lapNum + 1 };
      result.rankedLaps.push(rankedLap);
      thisLapForAllDrivers.push(rankedLap);
    }

    thisLapForAllDrivers.sort((a, b) => a.time - b.time);
    for (let i = 0; i < thisLapForAllDrivers.length; i++) {
      thisLapForAllDrivers[i].position = i + 1;
    }

    // add a fake 0th lap
    if (lapNum === 0) {
      for (const result of results) {
        result.rankedLaps.unshift({ time: 0, lapTime: 0, lapNum: '', position: result.rankedLaps[0].position });
      }
    }
  }
}

function _sortByPlace(results) {
  results.sort((a, b) => {
    if (a.totalLaps !== b.totalLaps) {
      return b.totalLaps - a.totalLaps;
    }

    return a.rankedLaps[a.rankedLaps.length - 1].position - b.rankedLaps[b.rankedLaps.length - 1].position
  });
}

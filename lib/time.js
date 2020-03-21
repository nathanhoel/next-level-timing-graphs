exports.msToTimeFormat = function (ms, displayMinutes = false) {
  const minutesLabel = Math.floor(ms / 60000).toString().padStart(2, '0');
  const leftoverSeconds = displayMinutes ? ms % 60000 : ms;
  const secondsLabel = Math.floor(leftoverSeconds / 1000).toString().padStart(2, '0');
  const msLabel = (ms % 1000).toString().padStart(3, '0');
  const label = minutesLabel + ':' + secondsLabel + '.' + msLabel;
  return displayMinutes ? label : label.split(':')[1];
}

function updateProgress(current, total, barWidth = 20) {
  if (typeof total === 'number') {
    const progress = current / total;
    const filledLength = Math.round(progress * barWidth);
    const bar = `[${"#".repeat(filledLength)}${"-".repeat(barWidth - filledLength)}] ${current}/${total}`;
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${bar}`);
    } else {
      console.log(`Progress: ${current}/${total}`);
    }
  } else {
    const message = `Captured: ${current}`;
    if (process.stdout.isTTY) {
      process.stdout.write(`\r${message}`);
    } else {
      console.log(message);
    }
  }
}

module.exports = { updateProgress };
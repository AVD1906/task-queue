const MAX_ATTEMPTS = 3;

function getBackoffDelay(attempts) {
  // exponential backoff: 2^attempts * 1000ms
  // attempt 1 -> 2000ms, attempt 2 -> 4000ms, attempt 3 -> 8000ms
  return Math.pow(2, attempts) * 1000;
}

function shouldMoveToDeadLetter(attempts) {
  return attempts >= MAX_ATTEMPTS;
}

module.exports = { getBackoffDelay, shouldMoveToDeadLetter, MAX_ATTEMPTS };
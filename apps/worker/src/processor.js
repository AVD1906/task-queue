async function processJob(queue, payload) {
  console.log(`Processing job on queue:${queue}`, payload);

  // Simulate different processing times per queue
  const delays = {
    email: 1000,
    image: 2000,
    report: 3000,
  };

  const delay = delays[queue] || 1000;

  // Simulate random failures (20% chance) so we can test retry logic
  const willFail = Math.random() < 0.2;

  await new Promise((resolve) => setTimeout(resolve, delay));

  if (willFail) {
    throw new Error(`Simulated failure processing ${queue} job`);
  }

  return { success: true, processedAt: new Date().toISOString() };
}

module.exports = { processJob };
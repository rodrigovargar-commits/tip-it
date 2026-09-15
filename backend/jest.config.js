module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 15000,
  // Serial by design: every test file shares one real local MongoDB and
  // this setup wipes collections between tests. Isolating per-worker
  // databases would be more "correct" but is overkill for this suite's size.
  maxWorkers: 1,
};

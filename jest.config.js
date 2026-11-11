/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: { '^.+[.]ts$': 'ts-jest' },
  globalSetup: '<rootDir>/tests/global-setup.js',
  testTimeout: 20000,
}

// setup file for jest
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/__tests__/.*|(\\.|/)(e2e|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'js'],
  verbose: true,
  coverageReporters: ['html', 'text-summary']
};

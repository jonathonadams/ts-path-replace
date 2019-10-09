/**
 * Test programmatically
 */
const tspr = require('../dist');

tspr.tsPathReplace({
  tsConfig: 'example/apps/app2/tsconfig.json',
  references: true
});

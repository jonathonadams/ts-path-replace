/**
 * Test programmatically
 */
const tspr = require('../dist');

tspr
  .tsPathReplace({
    tsConfig: 'example/apps/app2/tsconfig.json',
    references: true,
    watch: true
  })
  .then(watcher => {
    let interval = setInterval(() => {
      console.log('running', watcher.running);
    }, 1000);

    setTimeout(() => {
      console.log('inside watcher stop');
      watcher.stop();
    }, 10000);

    setTimeout(() => {
      clearInterval(interval);
    }, 20000);
  });

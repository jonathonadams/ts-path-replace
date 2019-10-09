export function printHelp() {
  console.log('tspr usage:');
  console.log('');
  console.log('--help                         print this help');
  console.log(
    '--tsConfig={FILE_PATH}         read the tsconfig.json from {FILE_PATH} and attempt to replace all "@alias" imports with "../relative/imports"'
  );
  console.log(
    '--references={BOOLEAN}         to replace all the referenced project "@alias" paths. Defaults to false"'
  );
  console.log(
    '--watch={BOOLEAN}              watch the output directory of projects for file changes and re-run the path replacement. Defaults to false"'
  );
  console.log('');
  console.log('');
}

export function error(err: any, showHelp = false) {
  console.error(err);
  if (showHelp) {
    console.log('');
    printHelp();
  }
  process.exit(1);
}

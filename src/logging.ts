export function printHelp() {
  const help = `
  tspr usage:

  --help          print this help.
  --tsConfig      Path to the json config file to process. Default: 'tsconfig.json'.
  -references     Also replace imports in any referenced projects. Default: false.
  --watch, -w     Watch the output directory of all projects for file changes and re-run. Default: false.
  --ext           Append a file extension to the paths. Default: no extension.
  `;
  console.log(help);
}

export function error(err: any, showHelp = false) {
  console.error(err);
  if (showHelp) {
    console.log('');
    printHelp();
  }
  process.exit(1);
}

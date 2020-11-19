import minimist from 'minimist';
import { error } from './logging';
import { tsPathReplace } from './public_api';

export function cli(argv: string[]) {
  const args = minimist(argv.slice(2), {
    boolean: ['help', 'references', 'watch', 'w'],
    string: ['tsConfig', 'ext'],
  });

  // Print the help
  if (args.help) {
    error(null, /*showHelp=*/ true);
  }

  if (!args.tsConfig) {
    // If the path is not passed in, set to the root tsConfig.json
    console.log(
      'No tsConfig path specified, defaulting to the root tsconfig.json'
    );
    args.tsConfig = 'tsconfig.json';
  }

  if (!args.references) {
    args.references = false;
  }

  if (!args.watch || !args.w) {
    args.watch = false;
  }

  if (!args.ext) {
    args.ext = false;
  }

  tsPathReplace({
    tsConfig: args.tsConfig,
    references: args.references,
    watch: args.watch,
    ext: args.ext,
  });
}

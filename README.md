# @uqt/ts-path-replace

CLI tool to replace TypeScript paths from `@alias/import/paths` to `../relative/import/paths`

## Why this package

The long standing issues with TS not outputting relative paths can be found [here](https://github.com/Microsoft/TypeScript/issues/10866).

While there are a number of packages that have already tackled this issues, for whatever reason they were either limiting or did not suite my needs, hence this project.

Additionally, as of TSv3.0, external projects can be referenced in the `references` property of the tsconfig.json. This allows your project to `reference` and consume
code that is not under the source directory of the current project. At the time of creating the package, no other solution that I could get to work also replaces referenced projects.

## Solution

The package provides a CLI and runtime API to rewrite and replace the imports paths of a typescript project. Additionally it will also replace any referenced projects.

## Versioning

The package follows [semver](https://semver.org/) versioning and releases are automated by [semantic release](https://www.npmjs.com/package/semantic-release)

## Installation

```bash
# Install Globally
npm install -g @uqt/ts-path-replace

# Install locally
npm install --save-dev @uqt/ts-path-replacr
```

## Usage

### CLI

To use the CLI, navigate to the directory and run `tspr`. By default, it will read the `tsconfig.json` located in the root directory.

```bash
# Globally
$ tspr

# Locally
$ npx tspr
```

Optionally, you can pass the path to the desired `tsconfig.json` to process

```bash
# Passing in a path to a tsconfig.json
$ npx tspr --tsConfig some/path/to/tsconfig.json

# Replace the paths for the references projects and watch the output directories for changes to rerun
$ npx tspr --tsConfig path/to/tsconfig.json --references true --watch true
```

### Runtime

```js
// commonjs
const tspr = require('@uqt/ts-path-replace');

tspr.tsPathReplace({ path: 'path/to/tsconfig.json' });

// ES6
import { tsPathReplace } from '@uqt/ts-path-replace';

tsPathReplace({
  path: 'path/to/tsconfig.json',
  references: true,
  watch: true
});
```

## API Documentation

```bash
# CLI
tspr [--option]
```

```JavaScript
// run time
tsPathReplace([options]);
```

**Options** \<Object\>

| Option                  | Description                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| tsConfig: **string**    | Path to the json config file to process **Default:** `tsconfig.json`                         |
| references: **boolean** | To also replace imports in any referenced projects **Default:** `false`                      |
| watch: **boolean**      | Watch the output directory for file changes and re-run the path replace **Default:** `false` |

**Returns** Promise\<Object>

| Property                   | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| running: **boolean**       | If the process is still running (watch mode)                      |
| stop(): **Promise\<void>** | A method to stop the process if it currently running (watch mode) |

## Example

There is an example of a 'monorepo' style setup located in the /example directory.

The examples includes multiple 'apps' with multiple referenced projects.

To run the example

```bash
# You will have to build the project first
npm run build
# Build the example
npm run example:build
# run the path replacement
npm run example:tspr
# run the project
npm run example:run
```

Running the above should should build the example, replace the import paths and then output some logging to the terminal.

If you look in the `example/out` directory, you should see all `.js` files have been replaced with relative imports

## Contributing

Contributions and PR's are welcome!

### Commit Message Guidelines

[Commit Guidelines](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)

## Known limitations

- Only the first element of each of the paths properties is used.
- The referenced tsConfig in the references must point to an project config file with source files and an output directory, it can't be a config that references other projects and has not project files.

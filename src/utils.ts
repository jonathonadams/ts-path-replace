import { resolve, dirname, extname, join } from 'path';
import fs, { promises as fsPromises, access, FSWatcher } from 'fs';
const { stat } = fsPromises;
import { promisify } from 'util';
import path from 'path';
import glob from 'glob';
import { IPathDictionary, IAliasPaths } from './types';
import { error } from './logging';
import { createCombinedConfigObject } from './combined-config';
import { replaceAliasImports } from './replace-aliases';

export const asyncGlob = promisify(glob);

export function jsFilesPattern(outDir: string) {
  return `${outDir}/**/*.js`;
}

// This works because the last function to be composed is the async function
export async function jsFileSearch(outDir: string) {
  return asyncGlob(jsFilesPattern(outDir));
}

export function createPathDictionary(paths: IAliasPaths): IPathDictionary {
  // NOTE, only takes the first argument in the array of path
  const dicReducer = dictionaryReducer(paths);
  return Object.keys(paths).reduce(dicReducer, {});
}

function dictionaryReducer(paths: IAliasPaths) {
  return function reducer(dictionary: IPathDictionary, alias: string) {
    const dir = paths[alias].slice()[0];
    dictionary[dir] = alias;
    return dictionary;
  };
}

export function curryResolve(path1: string) {
  return function(path2: string) {
    return path.resolve(path1, path2);
  };
}

export function resolvePath(configPath: string) {
  return curryResolve(path.dirname(configPath));
}

/**
 * The referenced tsconfig can either be a file or directory
 * Append 'tsconfig.json' to the path if it is a directory
 *
 * @param path Path to the referenced config file or directory
 * @param dir The current directory of the config file
 */
export async function createAbsConfigPath(configFilePath: string, dir: string) {
  const referencedTsConfig = resolve(dir, configFilePath);

  // Note that the reference ts configs may point to a directory
  // that loads the ts config or a config file itself.
  const arePathsFiles = await stat(referencedTsConfig);

  // If it is a file, return the path, else add the default 'tsconfig.json' to it
  if (arePathsFiles.isFile()) {
    return referencedTsConfig;
  } else {
    return resolve(referencedTsConfig, 'tsconfig.json');
  }
}

/**
 * Utility to check if all the appropriate directories are defined
 *
 * @param baseUrl
 * @param outDir
 * @param rootDir
 * @param paths
 */
export function areDirectoriesDefined(
  baseUrl: string | undefined,
  outDir: string | undefined,
  rootDir: string | undefined,
  paths: IAliasPaths | undefined
) {
  if (baseUrl === undefined) {
    error(new Error('baseUrl is not defined'));
  }

  if (outDir === undefined) {
    error(new Error('outDir is not defined'));
  }

  if (rootDir === undefined) {
    error(new Error('rootDir is not defined'));
  }

  if (paths === undefined) {
    error(new Error('No paths have been defined'));
  }
}

/**
 * Resolve each individual referenced ts config
 *
 * @param configPath
 */
export async function referenceConfigDirectories(configPath: string) {
  const relative = await createCombinedConfigObject(configPath);
  return { ...relative.pathDirectories, configDir: dirname(configPath) };
}

export function filterDictionaryKey(baseUrl: string, rootDir: string) {
  return function filter(projectKey: string): boolean {
    // TODO -> is using the base url correct here?
    const rootDirOfProject = resolve(baseUrl, dirname(projectKey));
    return rootDirOfProject.includes(rootDir);
  };
}

// as the file goes deeper, add additional "../" relative imports from the root dir
export function addPathDepthFromCWD(depth: number) {
  return ''.padStart(depth * 3, '../');
}

export function doesStringEndInWildcard(string: string) {
  return string.substring(string.length - 1) === '*';
}

export function watcherCloseHandler(watcher: FSWatcher): Promise<void> {
  return new Promise((res, rej) => {
    watcher.on('close', () => {
      res();
    });
  });
}

export function onOutDirChange(outDir: string, dictionary: IPathDictionary) {
  return (eventType: string, fileName: string | Buffer) => {
    if (eventType === 'update') {
      try {
        // get the file extension because we only want to ao re-write .js & .jsx files
        const extension = extname(fileName as string);
        if (extension === '.js' || extension === '.jsx') {
          // The files are not fully resolved, so only join with the output directory (where watching from)
          const file = join(outDir, fileName as string);
          // The file needs to be an array here
          // ignore any errors on watch
          replaceAliasImports(outDir, [file], dictionary);
        }
      } catch (err) {
        // ignore error
      }
    }
  };
}

export function doesDirExist(dir: string): Promise<boolean> {
  return new Promise((res, reject) => {
    access(dir, fs.constants.F_OK, err => {
      err ? res(false) : res(true);
    });
  });
}

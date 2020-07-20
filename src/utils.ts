import { resolve, dirname, extname } from 'path';
import fs, { access, FSWatcher } from 'fs';
const { stat, readdir } = fs.promises;
import path from 'path';
import { IPathDictionary, IAliasPaths } from './types';
import { error } from './logging';
import { createCombinedConfigObject } from './combined-config';
import { replaceAliasImports } from './replace-aliases';

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
  return function (path2: string) {
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
  return (eventType: string, fileName: string) => {
    if (eventType === 'update') {
      try {
        // get the file extension because we only want to re-write .js & .jsx files
        const extension = extname(fileName);
        if (extension === '.js' || extension === '.jsx') {
          // The file needs to be an array here
          replaceAliasImports(outDir, [fileName], dictionary);
        }
      } catch (err) {
        // ignore error
      }
    }
  };
}

export function doesDirExist(dir: string): Promise<boolean> {
  return new Promise((res, reject) => {
    access(dir, fs.constants.F_OK, (err) => {
      err ? res(false) : res(true);
    });
  });
}

async function getFiles(dir: string): Promise<string[]> {
  try {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files: string[][] = await Promise.all(
      dirents.map((d) => {
        const subPath = resolve(dir, d.name);
        if (d.isDirectory()) {
          return getFiles(subPath);
        } else {
          return Promise.resolve([subPath]);
        }
      })
    );
    return Array.prototype.concat(...files);
  } catch (e) {
    return [];
  }
}

export async function jsFileSearch(dir: string): Promise<string[]> {
  const files = await getFiles(dir);
  return files.filter((f) => extname(f) === '.js');
}

import { promises as fs } from 'fs';
import merge from 'lodash.merge';
import {
  IPathLocations,
  ITSConfig,
  ICompilerOptions,
  IPartialPathLocations
} from './types';
import { resolvePath } from './utils';

/**
 * Recursively look up the 'extends' property and creates a object with all properties
 *
 * Keeps track of what directory the rootDir, outDir, and baseUrl are defined.
 *
 * so return an object with a property of the combined config and the directories where they
 * were defined
 *
 * @export
 * @param {string} configPath
 * @param {PathLocations} [paths={} as any]
 * @returns {Promise<{ config: any; pathDirectories: PathLocations }>}
 */
export async function createCombinedConfigObject(
  configPath: string,
  paths: IPartialPathLocations = {}
): Promise<{ config: ITSConfig; pathDirectories: IPathLocations }> {
  // Prep the curried path Resolver
  const pathResolver = resolvePath(configPath);

  // 1. Read the file and parse it
  const child = await fs.readFile(configPath, 'utf8');
  const config: ITSConfig = JSON.parse(child);

  // 2. Pop of the relevant properties
  const { rootDir, outDir, baseUrl } = config[
    'compilerOptions'
  ] as ICompilerOptions;

  if (rootDir && !paths.rootDir) {
    paths.rootDir = pathResolver(rootDir);
  }

  if (outDir && !paths.outDir) {
    paths.outDir = pathResolver(outDir);
  }

  if (baseUrl && !paths.baseUrl) {
    paths.baseUrl = pathResolver(baseUrl);
  }

  // 2. Check if the config extends another one
  const { extends: extendsPath } = config;

  if (extendsPath) {
    // 3. resolve the path to the parent config
    const newTsConfigPath = pathResolver(extendsPath);

    // 4. Read the parent config
    const parentConfig = await createCombinedConfigObject(
      newTsConfigPath,
      paths
    );

    // 5. Deeply merge the child over the parent
    const newConfig = merge(parentConfig.config, config);

    return {
      config: newConfig,
      pathDirectories: parentConfig.pathDirectories
    };
  } else {
    // 6. Has no parent so return the child
    return {
      config,
      pathDirectories: paths as IPathLocations
    };
  }
}

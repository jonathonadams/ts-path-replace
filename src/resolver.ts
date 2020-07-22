import {
  resolve,
  relative,
  format,
  dirname,
  basename,
  sep,
  join,
  normalize,
} from 'path';
import {
  IFilteredReferences,
  IResolvedConfigPaths,
  IPathDictionary,
  IAliasPaths,
} from './types';
import { createCombinedConfigObject } from './combined-config';
import {
  createPathDictionary,
  createAbsConfigPath,
  areDirectoriesDefined,
  referenceConfigDirectories,
  filterDictionaryKey,
} from './utils';

/**
 * This function needs to take in a path to a ts config file
 * and then return an object of aliases to relative paths based of the outDirs
 *
 * @export
 * @param {string} configPath
 * @returns {Promise<ResolvedConfigPaths>}
 */
export async function resolveConfigPaths(
  configPath: string
): Promise<IResolvedConfigPaths | undefined> {
  const configDir = dirname(configPath);
  // collect the paths of the referenced 'tsconfig's so the parent function can
  // recursively rewrite those paths also
  const referenceTsConfigPaths: string[] = [];

  // 2. Create a combined config object of all the extended properties
  // The relevant directories are also returned
  const {
    config: {
      compilerOptions: { paths },
      references,
    },
    pathDirectories: { baseUrl, outDir, rootDir },
  } = await createCombinedConfigObject(configPath);

  // If there is no paths referenced, then there is nothing to do
  if (paths !== undefined) {
    // 3 . Check all appropriate directories are defined
    // This will exit the application if one is not defined
    areDirectoriesDefined(baseUrl, outDir, rootDir, paths);

    // 4. Make path imports for local aliases and filter out the referenced projects
    // The internal imports is the starting of the total dictionary
    const {
      internal: dictionary,
      external,
    } = await filterReferencedAndResolveInternal(
      paths,
      baseUrl as string,
      configDir,
      rootDir
    );

    // 5. Make relative path aliases for those that are referenced (requires TS.v3)
    if (references !== undefined) {
      // 6. Create a dictionary lookup of the referenced paths only
      const refDictionary = createPathDictionary(external);

      /**
       * For each ref in the references property of the tsconfig a relative import must be created
       * from the outDir of the parent config and the outDir of the referenced project.
       *
       * a. Find the absolute path to to the referenced project tsConfig
       * b. Push it onto the array or reference projects to rewrite them
       * c. Create an object with relevant properties from the referenced tsConfig
       * d. Determine the alias, baseFile and the relative to project source
       * e. Compute the relative path location from root of the project to the referenced project
       *    by using the outDir of the main project and the outDir of the referenced project
       * f. Add the base file on to the relative path
       * g. Add to the dictionary of imports to replace
       */
      for (const ref of references) {
        if (!isReferenceInitialConfig(configDir, configPath, ref.path)) {
          // a)
          const absolutePathToReferenceConfig = await createAbsConfigPath(
            ref.path,
            configDir
          );

          // b)
          referenceTsConfigPaths.push(absolutePathToReferenceConfig);

          // c)
          const referencedProjectDirectories = await referenceConfigDirectories(
            absolutePathToReferenceConfig
          );

          // d)
          const referenceObject = addAdditionalFileReferences(
            referencedProjectDirectories,
            refDictionary
          );

          if (referenceObject !== null) {
            // e)
            const relativeDir = relative(
              outDir,
              resolve(
                referenceObject.outDir,
                referenceObject.relativeToProjectSrc
              )
            );

            // f)
            const computedImport = format({
              dir: relativeDir,
              base: referenceObject.baseFile,
            });

            // g)
            dictionary[referenceObject.alias] = computedImport;
          }
        }
      }
    }

    return {
      dictionary,
      outDir: outDir as string,
      referenceTsConfigPaths,
    };
  }
}

function isReferenceInitialConfig(
  configDir: string,
  configPath: string,
  refConfig: string
): boolean {
  const path = join(configDir, refConfig);
  return normalize(configPath) === normalize(path);
}

/**
 * Function takes the the reference project, and the dictionary to calculate additional properties for the
 * specific projects
 *
 * It calculates the '@alias', the filename and the relativity from the projects source directory
 *
 * The reference object will be different for each project that is reference
 * The dictionary will be the same.
 *
 * For each reference, need to find the right one in the dictionary that refers to
 * the project.
 *
 * To do this, create an full resolve path joined by the baseUrl of the referenced object
 * and the directory based on the current dictionary key
 *
 * If the fully resolved directory of the current diction key included the rooDir of the referenceObject
 * then it is the appropriate key
 *
 * @param refObject
 * @param dictionary
 */
export function addAdditionalFileReferences(
  {
    configDir,
    rootDir,
    outDir,
    baseUrl,
  }: {
    configDir: string;
    rootDir: string;
    outDir: string;
    baseUrl: string;
  },
  dictionary: IPathDictionary
) {
  // NOTE the keys here are the 'paths/of/the/references/projects.ts'
  const dictionaryKeys = Object.keys(dictionary);

  const filterFunction = filterDictionaryKey(baseUrl, rootDir);

  // There will only be one project left, so destructor it to get the key
  // Note that in some scenarios, such as a solution ts config that references
  // multiple others, the project key may not exist anyway in the dictionary
  const [projectKey] = dictionaryKeys.filter(filterFunction);

  if (projectKey) {
    const additionalProperties = {
      alias: dictionary[projectKey],
      baseFile: basename(projectKey, '.ts'),
      relativeToProjectSrc: relative(
        rootDir,
        resolve(baseUrl, dirname(projectKey))
      ),
    };

    return {
      configDir,
      rootDir,
      outDir,
      baseUrl,
      ...additionalProperties,
    };
  }

  return null;
}

/**
 *
 * For the files that are referenced, i.e. outside of the source directory further processing is required.
 * For those under the same source directory, the relative import can be created.
 *
 * Filter out the local vs referenced files here helps when processing further.
 *
 */
export function filterReferencedAndResolveInternal(
  paths: IAliasPaths,
  baseUrl: string,
  baseDir: string,
  rootDir: string
): IFilteredReferences {
  const configDir = resolve(baseDir);
  const internalDictionary: IPathDictionary = {};
  const external: IAliasPaths = {};

  let alias: string,
    aliasPath: string,
    projectConfigDir: string,
    baseFile: string,
    relativeDirectory: string,
    relativeFile: string;

  const keys = Object.keys(paths);

  keys.forEach((key) => {
    if (paths[key].length > 0) {
      // first entry in the path array
      alias = paths[key].slice().shift() as string;
      aliasPath = resolve(baseUrl, alias);

      /**
       * If the first section of the alias is the same as the src tsConfig
       * Then the files are NOT referenced and are a local alias only and no
       * further lookups for tsConfig need to happen
       */
      projectConfigDir = aliasPath.substr(0, configDir.length);

      if (projectConfigDir === configDir) {
        baseFile = basename(aliasPath, '.ts');
        relativeDirectory = relative(rootDir, resolve(baseUrl, dirname(alias)));

        relativeFile = format({
          dir: relativeDirectory,
          base: baseFile,
        });

        // Split via the path separator (win/linux)
        const splitPaths = relativeFile.split(sep);

        // Join them by the linux operator
        internalDictionary[key] = `./${splitPaths.join('/')}`;
      } else {
        external[key] = paths[key];
      }
    }
  });

  return {
    internal: internalDictionary,
    external,
  };
}

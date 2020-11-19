import { FSWatcher } from 'fs';
import watch from 'node-watch';
import {
  jsFileSearch,
  watcherCloseHandler,
  onOutDirChange,
  doesDirExist,
} from './utils';
import { resolveConfigPaths } from './resolver';
import { replaceAliasImports } from './replace-aliases';
import { error } from './logging';

export { tsPathReplace };

/**
 * As of TSv3.0, external projects can be referenced in the 'references' property
 * of the tsconfig.json. If `references` is true, this function will attempt to
 * rewrite all alias paths, including any referenced project
 *
 * @export
 * @param {{
 *   tsConfig?: string;
 *   references?: boolean;
 *   watch?: boolean;
 * }} [{
 *   tsConfig = 'tsconfig.json',
 *   references = false,
 *   watch: watchFiles = false
 * }={}]
 * @returns
 */
async function tsPathReplace({
  tsConfig = 'tsconfig.json',
  references,
  watch: watchFiles,
  ext,
}: {
  tsConfig?: string;
  references?: boolean;
  watch?: boolean;
  ext?: string;
} = {}) {
  try {
    console.log('[TSPR] Starting replacing TypeScript paths.');

    const pathReplace = await recurTsPathReplace(
      tsConfig,
      references,
      watchFiles,
      ext
    );

    console.log('[TSPR] Finished replacing TypeScript paths.');

    if (watchFiles) {
      console.log('[TSPR] Watching output directories for file changes');
    }

    return pathReplace;
  } catch (err) {
    error(err);
  }
}

/**
 * @param {string} tsConfigPath path to a TypeScrip config file
 * @param {boolean} [refs=false] also replace referenced projects
 * @param {boolean} [watchFiles=false] watch output directories for changes and re-run
 * @param {({ [key: string]: true | undefined })} [outDirCache={}] a 'cache' of the output directories that have been processed
 * @returns {({ running: boolean, stop: Promise<void> })}
 */
async function recurTsPathReplace(
  tsConfigPath: string,
  refs: boolean = false,
  watchFiles: boolean = false,
  ext: string | false = false,
  outDirCache: { [key: string]: true | undefined } = {}
) {
  let watcher: FSWatcher | undefined;
  const subProcesses: any[] = [];

  // Will return undefined if there is no references paths (i.e. nothing to do)
  const resolvedPaths = await resolveConfigPaths(tsConfigPath);

  if (resolvedPaths !== undefined) {
    const { dictionary, outDir, referenceTsConfigPaths } = resolvedPaths;

    if (outDirCache[outDir] !== true) {
      // The directory has not been re-written yet
      // Add to the cache of out directories so not to re-write more than once
      outDirCache[outDir] = true;

      // Find ALL files in the out dir
      const jsFiles = await jsFileSearch(outDir);

      // rewrite the imports
      await replaceAliasImports(outDir, jsFiles, dictionary, ext);

      // If the libs are true, rewrite all the reference project imports
      // This will recursively look up the tree
      if (refs) {
        for (const project of referenceTsConfigPaths) {
          const subPr = await recurTsPathReplace(
            project,
            /*refs*/ true,
            watchFiles,
            ext,
            outDirCache
          );
          subProcesses.push(subPr);
        }
      }

      // watch the output directory for any changes
      // and re-write each change
      if (watchFiles) {
        // check if the outPut directory currently exits,
        // because the project may not have been built yet
        const dirExist = await doesDirExist(outDir);

        if (dirExist) {
          // watch the output directory
          watcher = watch(
            outDir,
            { recursive: true },
            onOutDirChange(outDir, dictionary, ext)
          );
        }
      }
    }
  }

  return {
    /**
     * is the function still running
     */
    running: watchFiles,

    /**
     * Stops all process that are watching output directories. Resolves when each
     * watching process has stopped including all referenced projects. If no directories are
     * being watched, it will resolve instantly
     *
     * @returns {Promise<void>}
     */
    stop(): Promise<void> {
      // from the collection of suProcesses create an array of 'stop' promises
      const toClose = subProcesses.map((re) => re.stop());
      if (watcher) {
        toClose.push(watcherCloseHandler(watcher));
        watcher.close();
      }

      // Once everything resolves, update the running property
      return Promise.all(toClose).then(() => {
        this.running = false;
      });
    },
  };
}

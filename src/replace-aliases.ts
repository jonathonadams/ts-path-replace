import { replaceInFile } from 'replace-in-file';
import { addPathDepthFromCWD, doesStringEndInWildcard } from './utils';

// TODO -> Performance cache for imports and depths

export async function replaceAliasImports(
  outDir: string,
  files: string[],
  paths: { [alias: string]: string | undefined }
) {
  return Promise.all(
    files.map((file) => {
      /**
       * Get the file location from the root directory (out directory)
       * NOTE: Need to add 1 to the length of the outDir because the ourDir does
       * not contain the trailing path separator
       */
      const substr = file.substr(outDir.length + 1);

      // If in the root directory, length is 1, hence subtract one to get the depth from root
      const depthFromRootDirectory = substr.split(/\\|\//).length - 1;

      const options: any = {
        from: [],
        to: [],
      };

      Object.keys(paths).forEach((key) => {
        let relativePath = paths[key] as string;

        /**
         * For the keys that have wildcards at the end, just remove the trailing slash and '*'.
         */
        if (doesStringEndInWildcard(key)) {
          key = key.substring(0, key.length - 2);
          relativePath = relativePath.substring(0, relativePath.length - 2);
        }

        /**
         * The regex to replace must match for has a positive look behind to match the 'require("@path")' or 'import ... from "@path".
         * It also must account for some aliases that are not specific to a file e.e. "@path/*" so it must have a positive look ahead
         * that matches either the ' " or /
         *
         */
        const regexStr = `(?<=[ from |require(]["|'])${key}(?=["|'|\\/])`;
        const regex = new RegExp(regexStr, 'g');

        // because windows will read the referenced projects paths with "\", replace them with posix separators "/"
        const replacementString = `${addPathDepthFromCWD(
          depthFromRootDirectory
        )}${relativePath.replace(/\\/g, '/')}`;

        options.from.push(regex);
        options.to.push(replacementString);
      });

      // Set the files property
      options['files'] = file;
      // Call the replace function
      return replaceInFile(options);
    })
  );
}

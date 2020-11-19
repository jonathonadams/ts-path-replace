import { tsPathReplace } from '../dist/public_api.js';

tsPathReplace({
  tsConfig: 'example/apps/app2/tsconfig.json',
  references: true,
  ext: 'js',
});

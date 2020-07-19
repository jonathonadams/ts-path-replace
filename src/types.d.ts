export interface IPartialPathLocations {
  rootDir?: string;
  outDir?: string;
  baseUrl?: string;
}

export interface IPathLocations {
  rootDir: string;
  outDir: string;
  baseUrl: string;
}

export interface IFilteredReferences {
  internal: IPathDictionary;
  external: IAliasPaths;
}

export interface IResolvedConfigPaths {
  dictionary: IPathDictionary;
  outDir: string;
  referenceTsConfigPaths: string[];
}

export interface IAliasPaths {
  [ref: string]: string[];
}

// The path dictionary is an object of reversed order for the path references
// e.g. "../relative/path/"" :  "@alias/path"
// becomes "@alias/path": "../relative/path/"" :
export interface IPathDictionary {
  [path: string]: string;
}

export interface ITSConfig {
  extends?: string;
  compilerOptions: ICompilerOptions;
  references?: IReference[];
}

export interface IReference {
  path: string;
}

export interface ICompilerOptions {
  baseUrl?: string;
  rootDir?: string;
  outDir?: string;
  sourceMap?: boolean;
  declaration: boolean;
  esModuleInterop?: boolean;
  removeComments?: boolean;
  target?: string;
  module?: string;
  moduleResolution?: string;
  strict?: boolean;
  lib?: string[];
  tsBuildInfoFile?: string;
  composite?: boolean;
  paths?: IAliasPaths;
}

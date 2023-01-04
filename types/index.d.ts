import { OutputAsset, OutputChunk, RenderedModule, Plugin } from 'rollup';

import Logger from '../src/logger';

export type CustomHandle = (chartData: MixCharData, html: string, advise: Advise) => void;

export interface PluginOptions {
  // 需要排除的文件
  excludeAssets?: string[];
  // 日志函数
  logger?: typeof Logger;
  // 生成文件所在目录
  bundleDir?: string;
  // host默认127.0.0.1
  host?: string;
  // 端口 默认9800
  port?: number;
  // server模式下是否自动打开浏览器,默认是true
  openBrowser?: boolean;
  // 三种模式，生成JSON， 打开浏览器，生成静态的html文件
  analyzerMode?: 'server' | 'json' | 'static' | 'custom';
  // 生成的静态html文件名称
  reportFilename?: string;
  // 生成的包体积json文件的名字
  statsFilename?: string;
  logLevel?: 'info';
  // 生成包体积之后的回调函数,server模式不提供
  customHandle?: CustomHandle;
}

export type Module = OutputAsset | OutputChunk | RenderedModule;

export type TransformedModule = Omit<RenderedModule, 'modules'> & {
  modules: Array<TransformedModule>;
  tree?: any;
  name: string;
  size?: number;
  gzipSize?: number;
  parsedSize?: number;
  _code: string;
  originCode?: string;
};

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface ModuleItem {
  isAsset: boolean;
  label: string;
  // path?: string;
  statSize: number;
  gzipSize?: number;
  parsedSize?: number;
  groups?: ModuleItem[];
}

export type CharData = Array<ModuleItem>;

export interface MixCharData {
  lib: CharData;
  default: CharData;
}

export interface NoTreeSharking {
  size: number;
}

export interface Polyfill {
  // 体积
  size: number;
  // 后面补充网址介绍？或者
  url?: string;
}

export interface Rewrite {
  size: number;
  desc: string;
}

export interface ReplaceModule {
  target: string;
}

export interface NormalModule {}

export interface Advise {
  treeSharking: Record<string, NoTreeSharking>;
  replace: Record<string, ReplaceModule>;
  commonjs: Record<string, NormalModule>;
  polyfill: Record<string, Polyfill>;
  rewrite: Record<string, Rewrite>;
}

export default function bundleAnalyzer(opt: PluginOptions): Plugin;

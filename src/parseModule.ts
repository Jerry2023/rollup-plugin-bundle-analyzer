import { OutputAsset, OutputBundle, OutputChunk } from 'rollup';
import { minify } from 'terser';

import _ from 'lodash';

import { CharData, MixCharData, Module, TransformedModule } from '../types';

import { createModulesTree } from './tree/Folder';
import { sizeGetter } from './size';

export const codeMap: Record<string, string> = {};

export async function transformModule(
  module: Module,
  id: string,
  resolver?: (m: TransformedModule) => void
) {
  // fix https://github.com/ritz078/rollup-plugin-filesize/issues/57
  // @ts-ignore
  delete module.isAsset;
  // @ts-ignore
  const transformedModule: TransformedModule = {
    ...module,
    name: id,
    modules: [],
    originCode: codeMap[id],
    code:
      (
        await minify((module as OutputChunk).code ?? '', {
          // module: true,
          safari10: true
          // toplevel: true
        })
      ).code ?? ''
  };
  if (resolver) {
    resolver(transformedModule);
  }
  if (!('modules' in (module as OutputAsset))) {
    transformedModule.modules = [];
    return transformedModule;
  }
  transformedModule.modules = [];
  for (const [id, m] of Object.entries((module as OutputChunk).modules)) {
    // eslint-disable-next-line no-await-in-loop
    transformedModule.modules.push((await transformModule(m, id, resolver))!);
  }
  return transformedModule;
}

async function getModuleData(outputBundle: OutputBundle): Promise<CharData> {
  const modules: {
    [id: string]: TransformedModule;
  } = {};
  for (const [id, module] of Object.entries(outputBundle)) {
    // eslint-disable-next-line
    const chunk = await transformModule(module, id);
    chunk.tree = createModulesTree(chunk.modules);
    chunk.size = sizeGetter(chunk.code || '');
    modules[id] = chunk;
    if (module.type === 'asset') {
      const { source } = module;
      // 二进制资源文件，比如图片
      if (typeof source === 'string') {
        chunk.size = sizeGetter(source);
      } else {
        chunk.size = Buffer.byteLength(source);
      }
    }
  }
  return Object.entries(modules).map(([name, asset]) => {
    return {
      label: name,
      isAsset: true,
      statSize: asset.tree.size || asset.size,
      parsedSize: asset.tree.renderSize,
      gzipSize: asset.tree.gzipSize,
      groups: _.invokeMap(asset.tree.children, 'toChartData') as CharData
    };
  });
}

interface Chunk {
  tree?: any;
}

async function getSplitLibData(outputBundle: OutputBundle): Promise<CharData> {
  const modules: {
    library: Chunk;
    project: Chunk;
  } = {
    library: {},
    project: {}
  };
  const libModules: TransformedModule[] = [];
  const projectModules: TransformedModule[] = [];
  for (const [id, module] of Object.entries(outputBundle)) {
    if (module.type === 'chunk') {
      // eslint-disable-next-line
      await transformModule(module, id, (m) => {
        if (m.name === id) {
          return;
        }
        if (m.name.indexOf('node_modules') > -1 || m.name.indexOf('vite') > -1) {
          libModules.push(m);
        } else {
          projectModules.push(m);
        }
      });
    }
  }
  modules.library.tree = createModulesTree(libModules);
  modules.project.tree = createModulesTree(projectModules);

  return Object.entries(modules).map(([name, asset]) => {
    return {
      label: name,
      isAsset: true,
      statSize: asset.tree.size,
      parsedSize: asset.tree.renderSize,
      gzipSize: asset.tree.gzipSize,
      groups: _.invokeMap(asset.tree.children, 'toChartData') as CharData
    };
  });
}

export default async function getMixCharData(outputBundle: OutputBundle): Promise<MixCharData> {
  return {
    lib: await getSplitLibData(outputBundle),
    default: await getModuleData(outputBundle)
  };
}

export type GetModuleData = typeof getModuleData;

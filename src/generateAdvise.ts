import { OutputBundle, PluginContext } from 'rollup';

import _ from 'lodash';

import { Advise } from '../types';

import { transformModule } from './parseModule';
import { getModulePathParts } from './tree/utils';
import { sizeGetter } from './size';

const getQuery = (schema: string) => schema.split('?').slice(1);

const formatName = (name: string) => name.split('.')?.[0];

export default async function generateAdvise(outputBundle: OutputBundle, context: PluginContext) {
  const advise: Advise = {
    treeSharking: {},
    replace: {},
    commonjs: {},
    polyfill: {},
    rewrite: {}
  };

  const replaceTpl = (moduleName: string, target: string) => {
    const name = formatName(moduleName);
    advise.replace[name] = {
      target
    };
  };

  const commonjsTpl = (moduleName: string) => {
    const name = formatName(moduleName);
    advise.commonjs[name] = {};
  };

  const treeSharkingTpl = (moduleName: string, size: number) => {
    const name = formatName(moduleName);
    advise.treeSharking[name] = {
      size
    };
  };

  const polyfillTpl = (moduleName: string, size: number) => {
    const name = formatName(moduleName);
    advise.polyfill[name] = {
      size
    };
  };

  const rewriteTpl = (moduleName: string, size: number, desc: string) => {
    const name = formatName(moduleName);
    advise.rewrite[name] = {
      size,
      desc
    };
  };

  for (const [id, module] of Object.entries(outputBundle)) {
    // eslint-disable-next-line no-await-in-loop
    await transformModule(module, id, (m) => {
      const pathParts = getModulePathParts(m);
      const name = _.last(pathParts);
      const moduleInfo = context.getModuleInfo(m.name);
      if (moduleInfo) {
        // 判断是否是项目引进的包，再判断是否可以优化
        const isImportByProject = moduleInfo.importers.find(
          (i) => i.indexOf('node_modules') === -1
        );
        if (isImportByProject) {
          const size = sizeGetter(m.code || '');
          if (pathParts && m.name.indexOf('node_modules') > -1 && /\.js| \.ts/.test(m.name)) {
            const nodeModulesIndex = pathParts.findIndex((i) => i === 'node_modules');
            if (nodeModulesIndex === -1) {
              return;
            }
            let moduleName = pathParts[nodeModulesIndex + 1];
            // eg @element-plus/icons-vue
            if (moduleName.indexOf('@') > -1) {
              moduleName = `${moduleName}/${pathParts[nodeModulesIndex + 2]}`;
            }
            if (
              m.removedExports &&
              Array.isArray(m.removedExports) &&
              m.removedExports.length === 0
            ) {
              treeSharkingTpl(moduleName, size);
            }
            const query = getQuery(m.name);
            if (query.find((i) => i === 'commonjs-module')) {
              commonjsTpl(moduleName);
            }
            if (moduleName.indexOf('polyfill') > -1) {
              polyfillTpl(moduleName, size);
            }
          }
          if (name) {
            if (name === 'moment.js') {
              replaceTpl(name, 'dayjs');
            }
            if (name === 'lodash.js') {
              replaceTpl(name, 'lodash-es.js');
            }
            if (name.indexOf('polyfill') > -1) {
              polyfillTpl(name, size);
            }
            if (name === 'js-file-downloader.js') {
              rewriteTpl(
                name,
                size,
                '该模块使用webpack打包，体积较大，建议参照核心功能重写，减少约50%体积'
              );
            }
          }
        }
      }
    });
  }
  return advise;
}

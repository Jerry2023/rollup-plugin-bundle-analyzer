import { NormalizedOutputOptions, OutputBundle, Plugin } from 'rollup';

import chalk from 'chalk';

import { PluginOptions } from '../types';

import getMixCharData, { codeMap } from './parseModule';
import startViewServe from './viewer';
import renderViewer from './template';
import logger from './logger';
import generateAdvise from './generateAdvise';

export default function bundleAnalyzer(userOpts: PluginOptions): Plugin {
  return {
    name: 'rollup-bundle-analyzer',
    // 暂时先用transform来获取原代码，用resolveId hook会有不执行的情况
    transform(code, id) {
      codeMap[id] = code;
      // babel
      // css
      // filer return [ast, map, code]
      return null;
    },
    async generateBundle(
      // @ts-ignore
      outputOptions: NormalizedOutputOptions,
      outputBundle: OutputBundle
    ): Promise<void> {
      // @ts-ignore
      const defaultOpts: PluginOptions = {
        analyzerMode: 'server',
        host: '127.0.0.1',
        port: 9800,
        reportFilename: 'bundle-analyzer.html',
        openBrowser: true,
        statsFilename: 'stats.json',
        logLevel: 'info',
        bundleDir: './'
      };

      const options = { ...defaultOpts, ...userOpts };
      const getModuleDataFun = () => getMixCharData(outputBundle);
      const { customHandle } = options;
      const advise = await generateAdvise(outputBundle, this);

      if (options.analyzerMode === 'server') {
        startViewServe(getModuleDataFun, options);
      } else if (options.analyzerMode === 'json') {
        const chartData = await getMixCharData(outputBundle);
        this.emitFile({
          type: 'asset',
          name: options.statsFilename,
          fileName: options.statsFilename,
          source: JSON.stringify(chartData)
        });
      } else if (options.analyzerMode === 'static') {
        const chartData = await getMixCharData(outputBundle);

        const html = renderViewer({
          title: 'rollup-bundle-analyzer',
          enableWebSocket: false,
          chartData,
          mode: 'static',
          defaultSizes: 'stat'
        });
        this.emitFile({
          type: 'asset',
          name: options.reportFilename,
          fileName: options.reportFilename,
          source: html
        });
      } else if (options.analyzerMode === 'custom') {
        const chartData = await getMixCharData(outputBundle);

        const html = renderViewer({
          title: 'rollup-bundle-analyzer',
          enableWebSocket: false,
          chartData,
          mode: 'static',
          defaultSizes: 'stat'
        });
        if (typeof customHandle === 'function') {
          customHandle(chartData, html, advise);
        }
      } else {
        // @ts-ignore
        logger.error(`${chalk.red('analyzerMode只支持server, json, static, custom')} `);
      }
    }
  };
}

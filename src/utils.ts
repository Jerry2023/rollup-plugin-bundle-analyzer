import { inspect, types } from 'util';

import _ from 'lodash';
import opener from 'opener';
import logger from './logger';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function createAssetsFilter(excludePatterns: any) {
  const excludeFunctions = _(excludePatterns)
    .castArray()
    .compact()
    .map((pattern) => {
      if (typeof pattern === 'string') {
        // eslint-disable-next-line no-param-reassign
        pattern = new RegExp(pattern, 'u');
      }

      if (types.isRegExp(pattern)) {
        return (asset: any) => pattern.test(asset);
      }

      if (typeof pattern !== 'function') {
        throw new TypeError(
          `Pattern should be either string, RegExp or a function, but "${inspect(pattern, {
            depth: 0
          })}" got.`
        );
      }

      return pattern;
    })
    .value();

  if (excludeFunctions.length) {
    return (asset: any) => excludeFunctions.every((fn) => fn(asset) !== true);
  } else {
    return () => true;
  }
}

export function defaultTitle() {
  const time = new Date();
  const year = time.getFullYear();
  const month = MONTHS[time.getMonth()];
  const day = time.getDate();
  const hour = `0${time.getHours()}`.slice(-2);
  const minute = `0${time.getMinutes()}`.slice(-2);

  const currentTime = `${day} ${month} ${year} at ${hour}:${minute}`;

  return `${process.env.npm_package_name || 'Webpack Bundle Analyzer'} [${currentTime}]`;
}

export function defaultAnalyzerUrl(options: { listenHost: string; boundAddress: any }) {
  const { listenHost, boundAddress } = options;
  return `http://${listenHost}:${boundAddress.port}`;
}

export const open = function (uri: string) {
  try {
    opener(uri);
  } catch (err) {
    // @ts-ignore
    logger.debug(`Opener failed to open "${uri}":\n${err}`);
  }
};

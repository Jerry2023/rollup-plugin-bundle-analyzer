import type { Level } from '../types';

const LEVELS = ['debug', 'info', 'warn', 'error', 'silent'];
const LOG_PREFIX = '\n[rollup-plugin-analyzer]';

const LEVEL_TO_CONSOLE_METHOD = new Map<Level, keyof Console>([
  ['debug', 'log'],
  ['info', 'log'],
  ['warn', 'log']
]);

class Logger {
  static levels = LEVELS;
  static defaultLevel: Level = 'info';
  activeLevels = new Set();

  constructor(level: Level = Logger.defaultLevel) {
    this.setLogLevel(level);
  }

  static log(level: Level, ...args: any[]) {
    const operation = LEVEL_TO_CONSOLE_METHOD.get(level) || level;
    // eslint-disable-next-line no-console
    console[operation as Extract<typeof operation, 'log'>](...args);
  }

  private setLogLevel(level: Level) {
    const levelIndex = LEVELS.indexOf(level);

    if (levelIndex === -1)
      throw new Error(`Invalid log level "${level}". Use one of these: ${LEVELS.join(', ')}`);

    this.activeLevels.clear();

    for (const [i, levelValue] of LEVELS.entries()) {
      if (i >= levelIndex) this.activeLevels.add(levelValue);
    }
  }
}

LEVELS.forEach((level) => {
  if (level === 'silent') return;

  // @ts-ignore
  Logger.prototype[level] = function log(...args) {
    if (this.activeLevels.has(level)) Logger.log(level as Level, LOG_PREFIX, ...args);
  };
});
const logger = new Logger('info');

export default logger;

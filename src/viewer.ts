import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

import WebSocket from 'ws';
import sirv from 'sirv';
import pkg from 'chalk';

import type { MixCharData, PluginOptions } from '../types';

import { open } from './utils';
import renderViewer from './template';
import logger from './logger';

type GetModuleDataFun = () => Promise<MixCharData>;

const { bold } = pkg;
let serverInstance: Awaited<ReturnType<typeof startServer>>;

// @ts-ignore
// eslint-disable-next-line no-underscore-dangle
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function analyzerUrl(options: { listenPort?: any; listenHost: any; boundAddress: any }) {
  const { listenHost, boundAddress } = options;
  return `http://${listenHost}:${boundAddress.port}`;
}

async function startServer(
  opts: PluginOptions,
  moduleData: MixCharData,
  getModuleDataFun: GetModuleDataFun
) {
  const { port = 8888, host = '127.0.0.1', openBrowser = true } = opts || {};

  const sirvMiddleware = sirv(`${projectRoot}/public`, { dev: true });

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const html = renderViewer({
        title: 'rollup-bundle-analyzer',
        enableWebSocket: true,
        chartData: moduleData,
        mode: 'serve',
        defaultSizes: 'stat'
      });
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      sirvMiddleware(req, res);
    }
  });

  await new Promise<void>((resolve) => {
    // @ts-ignore
    server.listen(port, host, () => {
      resolve();
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const url = analyzerUrl({
        listenPort: port,
        listenHost: host,
        boundAddress: server.address()
      });
      // @ts-ignore
      logger.info(
        `${bold('Rollup Bundle Analyzer')} is started at ${bold(url)}\n` +
          `Use ${bold('Ctrl+C')} to close it`
      );

      if (openBrowser) {
        open(url);
      }
    });
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    ws.on('error', (err) => {
      // Ignore network errors like `ECONNRESET`, `EPIPE`, etc.
      // @ts-ignore
      if (err.errno) return;
      // @ts-ignore
      logger.info(err.message);
    });
  });

  // eslint-disable-next-line consistent-return
  return {
    ws: wss,
    http: server,
    updateChartData
  };

  async function updateChartData() {
    const newChartData = await getModuleDataFun();

    if (!newChartData) return;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: 'chartDataUpdated',
            data: newChartData
          })
        );
      }
    });
  }
}

export default async function startViewServe(
  getModuleDataFun: GetModuleDataFun,
  pluginOpt: PluginOptions
) {
  const moduleData = await getModuleDataFun();
  if (serverInstance) {
    (await serverInstance).updateChartData();
  } else {
    serverInstance = await startServer(
      {
        openBrowser: pluginOpt.openBrowser,
        host: pluginOpt.host!,
        port: pluginOpt.port!,
        bundleDir: ''
      },
      moduleData,
      getModuleDataFun
    );
  }
}

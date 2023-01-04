import path from 'path';
import fs from 'fs';
import url from 'url';

import _ from 'lodash';

import { MixCharData } from '../types';
// @ts-ignore
const fileName = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileName);
const projectRoot = path.resolve(__dirname, '..', '..');
const assetsRoot = path.join(projectRoot, 'public');

function escapeJson(json?: Object) {
  return JSON.stringify(json).replace(/</gu, '\\u003c');
}

function getAssetContent(filename: string) {
  const assetPath = path.join(assetsRoot, filename);

  if (!assetPath.startsWith(assetsRoot)) {
    throw new Error(`"${filename}" is outside of the assets root`);
  }

  return fs.readFileSync(assetPath, 'utf8');
}

function html(strings: TemplateStringsArray, ...values: string[]) {
  return strings.map((string, index) => `${string}${values[index] || ''}`).join('');
}

function getScript(filename: string, mode?: string) {
  if (mode === 'static') {
    return `<!-- ${_.escape(filename)} --> <script>${getAssetContent(filename)}</script>`;
  }
  return `<script src="${_.escape(filename)}"></script>`;
}

export default function renderViewer({
  title,
  enableWebSocket,
  chartData,
  defaultSizes,
  mode
}: {
  title?: string;
  enableWebSocket?: Object;
  chartData?: MixCharData;
  defaultSizes?: string;
  mode?: string;
} = {}) {
  return html`<!DOCTYPE html>
    <html lang="">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${_.escape(title)}</title>
        <script>
          window.enableWebSocket = ${escapeJson(enableWebSocket)};
        </script>
        ${getScript('viewer.js', mode)}
      </head>

      <body>
        <div id="app"></div>
        <script>
          window.chartData = ${escapeJson(chartData)};
          window.defaultSizes = ${escapeJson(defaultSizes)};
        </script>
      </body>
    </html>`;
}

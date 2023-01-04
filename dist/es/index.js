import pkg from 'chalk';
import { minify } from 'terser';
import _ from 'lodash';
import gzipSize from 'gzip-size';
import * as path from 'path';
import path__default from 'path';
import * as http from 'http';
import * as url from 'url';
import url__default from 'url';
import WebSocket from 'ws';
import sirv from 'sirv';
import 'util';
import opener from 'opener';
import fs from 'fs';

const createBrotliSizeGetter = () => {
    return (code) => {
        // eslint-disable-next-line no-console
        const data = Buffer.from(code || '', 'utf-8');
        return data.length;
    };
};
const sizeGetter$1 = (code) => {
    const data = Buffer.from(code, 'utf-8');
    return data.length;
};

class Node {
    constructor(name, parent) {
        this.name = name;
        this.parent = parent;
    }
    get path() {
        return this.name;
    }
    get isRoot() {
        return !this.parent;
    }
}

const sizeGetter = createBrotliSizeGetter();
class Module extends Node {
    constructor(name, data, parent) {
        super(name, parent);
        this.data = data;
    }
    get size() {
        var _a;
        return sizeGetter((_a = this.originCode) !== null && _a !== void 0 ? _a : '');
    }
    get code() {
        return this.data.code;
    }
    get originCode() {
        return this.data.originCode;
    }
    get renderSize() {
        var _a;
        return sizeGetter((_a = this.data.code) !== null && _a !== void 0 ? _a : '');
    }
    get gzipSize() {
        if (!_.has(this, '_gzipSize')) {
            this._gzipSize = this.code ? gzipSize.sync(this.code) : undefined;
        }
        return this._gzipSize;
    }
    toChartData() {
        return {
            id: this.data.name,
            label: this.name,
            path: this.path,
            statSize: this.size,
            parsedSize: this.renderSize,
            gzipSize: this.gzipSize
        };
    }
}

function getModulePathParts(moduleData) {
    const projectRoot = process.cwd();
    const parsedPath = moduleData.name
        .replace(`${projectRoot}/`, '')
        .split('/')
        // Replacing `~` with `node_modules`
        .map((part) => (part === '~' ? 'node_modules' : part));
    return parsedPath.length ? parsedPath : null;
}

class Folder extends Node {
    constructor(name, parent) {
        super(name, parent);
        this.children = Object.create(null);
    }
    get gzipSize() {
        if (!_.has(this, '_gzipSize')) {
            this._gzipSize = this.code ? gzipSize.sync(this.code) : 0;
        }
        return this._gzipSize;
    }
    get code() {
        if (!_.has(this, '_code')) {
            this._code = this.walk((node, code) => { var _a; return (_a = code + node.code) !== null && _a !== void 0 ? _a : ''; }, '', false);
        }
        return this._code;
    }
    get originCode() {
        if (!_.has(this, '_originCode')) {
            this._originCode = this.walk((node, originCode) => { var _a; return (_a = originCode + node.originCode) !== null && _a !== void 0 ? _a : ''; }, '', false);
        }
        return this._originCode;
    }
    get size() {
        if (!_.has(this, '_size')) {
            this._size = this.walk((node, size) => size + node.size, 0, false);
        }
        return this._size;
    }
    get renderSize() {
        if (!_.has(this, '_renderSize')) {
            this._renderSize = this.walk((node, renderSize) => renderSize + node.renderSize, 0, false);
        }
        return this._renderSize;
    }
    getChild(name) {
        return this.children[name];
    }
    addChildModule(module) {
        const { name } = module;
        const currentChild = this.children[name];
        if (currentChild && currentChild instanceof Folder)
            return;
        // eslint-disable-next-line no-param-reassign
        module.parent = this;
        this.children[name] = module;
        delete this._size;
        delete this._code;
    }
    addChildFolder(folder) {
        this.children[folder.name] = folder;
        delete this._size;
        delete this._code;
        return folder;
    }
    walk(walker, state = {}, deep = true) {
        let stopped = false;
        function stop(finalState) {
            stopped = true;
            return finalState;
        }
        // eslint-disable-next-line consistent-return
        Object.values(this.children).forEach((child) => {
            if (deep && child.walk) {
                // eslint-disable-next-line no-param-reassign
                state = child.walk(walker, state, stop);
            }
            else {
                // eslint-disable-next-line no-param-reassign
                state = walker(child, state, stop);
            }
            if (stopped)
                return false;
        });
        return state;
    }
    mergeNestedFolders() {
        if (!this.isRoot) {
            let childNames;
            // 合并只有一个文件的目录
            // eslint-disable-next-line no-cond-assign
            while ((childNames = Object.keys(this.children)).length === 1) {
                // eslint-disable-next-line prefer-destructuring
                const childName = childNames[0];
                const onlyChild = this.children[childName];
                if (onlyChild instanceof this.constructor) {
                    this.name += `/${onlyChild.name}`;
                    this.children = onlyChild.children;
                }
                else {
                    break;
                }
            }
        }
        this.walk((child) => {
            // eslint-disable-next-line no-param-reassign
            child.parent = this;
            if (child.mergeNestedFolders) {
                child.mergeNestedFolders();
            }
        }, null, false);
    }
    addModule(moduleData) {
        const pathParts = getModulePathParts(moduleData);
        if (!pathParts) {
            return;
        }
        const [folders, fileName] = [pathParts.slice(0, -1), _.last(pathParts)];
        let currentFolder = this;
        folders.forEach((folderName) => {
            let childNode = currentFolder.getChild(folderName);
            if (!childNode || !(childNode instanceof Folder)) {
                childNode = currentFolder.addChildFolder(new Folder(folderName, this));
            }
            currentFolder = childNode;
        });
        if (fileName) {
            const module = new Module(fileName, moduleData, this);
            currentFolder.addChildModule(module);
        }
    }
    toChartData() {
        return {
            label: this.name,
            path: this.path,
            statSize: this.size,
            parsedSize: this.renderSize,
            groups: _.invokeMap(this.children, 'toChartData'),
            gzipSize: this.gzipSize
        };
    }
}
function createModulesTree(modules) {
    const root = new Folder('.');
    modules.forEach((module) => root.addModule(module));
    root.mergeNestedFolders();
    return root;
}

const codeMap = {};
async function transformModule(module, id, resolver) {
    var _a, _b;
    // fix https://github.com/ritz078/rollup-plugin-filesize/issues/57
    // @ts-ignore
    delete module.isAsset;
    // @ts-ignore
    const transformedModule = {
        ...module,
        name: id,
        modules: [],
        originCode: codeMap[id],
        code: (_b = (await minify((_a = module.code) !== null && _a !== void 0 ? _a : '', {
            // module: true,
            safari10: true
            // toplevel: true
        })).code) !== null && _b !== void 0 ? _b : ''
    };
    if (resolver) {
        resolver(transformedModule);
    }
    if (!('modules' in module)) {
        transformedModule.modules = [];
        return transformedModule;
    }
    transformedModule.modules = [];
    for (const [id, m] of Object.entries(module.modules)) {
        // eslint-disable-next-line no-await-in-loop
        transformedModule.modules.push((await transformModule(m, id, resolver)));
    }
    return transformedModule;
}
async function getModuleData(outputBundle) {
    const modules = {};
    for (const [id, module] of Object.entries(outputBundle)) {
        // eslint-disable-next-line
        const chunk = await transformModule(module, id);
        chunk.tree = createModulesTree(chunk.modules);
        chunk.size = sizeGetter$1(chunk.code || '');
        modules[id] = chunk;
        if (module.type === 'asset') {
            const { source } = module;
            // 二进制资源文件，比如图片
            if (typeof source === 'string') {
                chunk.size = sizeGetter$1(source);
            }
            else {
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
            groups: _.invokeMap(asset.tree.children, 'toChartData')
        };
    });
}
async function getSplitLibData(outputBundle) {
    const modules = {
        library: {},
        project: {}
    };
    const libModules = [];
    const projectModules = [];
    for (const [id, module] of Object.entries(outputBundle)) {
        if (module.type === 'chunk') {
            // eslint-disable-next-line
            await transformModule(module, id, (m) => {
                if (m.name === id) {
                    return;
                }
                if (m.name.indexOf('node_modules') > -1 || m.name.indexOf('vite') > -1) {
                    libModules.push(m);
                }
                else {
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
            groups: _.invokeMap(asset.tree.children, 'toChartData')
        };
    });
}
async function getMixCharData(outputBundle) {
    return {
        lib: await getSplitLibData(outputBundle),
        default: await getModuleData(outputBundle)
    };
}

const LEVELS = ['debug', 'info', 'warn', 'error', 'silent'];
const LOG_PREFIX = '\n[rollup-plugin-analyzer]';
const LEVEL_TO_CONSOLE_METHOD = new Map([
    ['debug', 'log'],
    ['info', 'log'],
    ['warn', 'log']
]);
class Logger {
    constructor(level = Logger.defaultLevel) {
        this.activeLevels = new Set();
        this.setLogLevel(level);
    }
    static log(level, ...args) {
        const operation = LEVEL_TO_CONSOLE_METHOD.get(level) || level;
        // eslint-disable-next-line no-console
        console[operation](...args);
    }
    setLogLevel(level) {
        const levelIndex = LEVELS.indexOf(level);
        if (levelIndex === -1)
            throw new Error(`Invalid log level "${level}". Use one of these: ${LEVELS.join(', ')}`);
        this.activeLevels.clear();
        for (const [i, levelValue] of LEVELS.entries()) {
            if (i >= levelIndex)
                this.activeLevels.add(levelValue);
        }
    }
}
Logger.levels = LEVELS;
Logger.defaultLevel = 'info';
LEVELS.forEach((level) => {
    if (level === 'silent')
        return;
    // @ts-ignore
    Logger.prototype[level] = function log(...args) {
        if (this.activeLevels.has(level))
            Logger.log(level, LOG_PREFIX, ...args);
    };
});
const logger = new Logger('info');

const open = function (uri) {
    try {
        opener(uri);
    }
    catch (err) {
        // @ts-ignore
        logger.debug(`Opener failed to open "${uri}":\n${err}`);
    }
};

// @ts-ignore
const fileName = url__default.fileURLToPath(import.meta.url);
const __dirname$1 = path__default.dirname(fileName);
const projectRoot$1 = path__default.resolve(__dirname$1, '..', '..');
const assetsRoot = path__default.join(projectRoot$1, 'public');
function escapeJson(json) {
    return JSON.stringify(json).replace(/</gu, '\\u003c');
}
function getAssetContent(filename) {
    const assetPath = path__default.join(assetsRoot, filename);
    if (!assetPath.startsWith(assetsRoot)) {
        throw new Error(`"${filename}" is outside of the assets root`);
    }
    return fs.readFileSync(assetPath, 'utf8');
}
function html(strings, ...values) {
    return strings.map((string, index) => `${string}${values[index] || ''}`).join('');
}
function getScript(filename, mode) {
    if (mode === 'static') {
        return `<!-- ${_.escape(filename)} --> <script>${getAssetContent(filename)}</script>`;
    }
    return `<script src="${_.escape(filename)}"></script>`;
}
function renderViewer({ title, enableWebSocket, chartData, defaultSizes, mode } = {}) {
    return html `<!DOCTYPE html>
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

const { bold } = pkg;
let serverInstance;
// @ts-ignore
// eslint-disable-next-line no-underscore-dangle
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
function analyzerUrl(options) {
    const { listenHost, boundAddress } = options;
    return `http://${listenHost}:${boundAddress.port}`;
}
async function startServer(opts, moduleData, getModuleDataFun) {
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
        }
        else {
            sirvMiddleware(req, res);
        }
    });
    await new Promise((resolve) => {
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
            logger.info(`${bold('Rollup Bundle Analyzer')} is started at ${bold(url)}\n` +
                `Use ${bold('Ctrl+C')} to close it`);
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
            if (err.errno)
                return;
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
        if (!newChartData)
            return;
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    event: 'chartDataUpdated',
                    data: newChartData
                }));
            }
        });
    }
}
async function startViewServe(getModuleDataFun, pluginOpt) {
    const moduleData = await getModuleDataFun();
    if (serverInstance) {
        (await serverInstance).updateChartData();
    }
    else {
        serverInstance = await startServer({
            openBrowser: pluginOpt.openBrowser,
            host: pluginOpt.host,
            port: pluginOpt.port,
            bundleDir: ''
        }, moduleData, getModuleDataFun);
    }
}

const getQuery = (schema) => schema.split('?').slice(1);
const formatName = (name) => { var _a; return (_a = name.split('.')) === null || _a === void 0 ? void 0 : _a[0]; };
async function generateAdvise(outputBundle, context) {
    const advise = {
        treeSharking: {},
        replace: {},
        commonjs: {},
        polyfill: {},
        rewrite: {}
    };
    const replaceTpl = (moduleName, target) => {
        const name = formatName(moduleName);
        advise.replace[name] = {
            target
        };
    };
    const commonjsTpl = (moduleName) => {
        const name = formatName(moduleName);
        advise.commonjs[name] = {};
    };
    const treeSharkingTpl = (moduleName, size) => {
        const name = formatName(moduleName);
        advise.treeSharking[name] = {
            size
        };
    };
    const polyfillTpl = (moduleName, size) => {
        const name = formatName(moduleName);
        advise.polyfill[name] = {
            size
        };
    };
    const rewriteTpl = (moduleName, size, desc) => {
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
                const isImportByProject = moduleInfo.importers.find((i) => i.indexOf('node_modules') === -1);
                if (isImportByProject) {
                    const size = sizeGetter$1(m.code || '');
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
                        if (m.removedExports &&
                            Array.isArray(m.removedExports) &&
                            m.removedExports.length === 0) {
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
                            rewriteTpl(name, size, '该模块使用webpack打包，体积较大，建议参照核心功能重写，减少约50%体积');
                        }
                    }
                }
            }
        });
    }
    return advise;
}

function bundleAnalyzer(userOpts) {
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
        outputOptions, outputBundle) {
            // @ts-ignore
            const defaultOpts = {
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
            }
            else if (options.analyzerMode === 'json') {
                const chartData = await getMixCharData(outputBundle);
                this.emitFile({
                    type: 'asset',
                    name: options.statsFilename,
                    fileName: options.statsFilename,
                    source: JSON.stringify(chartData)
                });
            }
            else if (options.analyzerMode === 'static') {
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
            }
            else if (options.analyzerMode === 'custom') {
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
            }
            else {
                // @ts-ignore
                logger.error(`${pkg.red('analyzerMode只支持server, json, static, custom')} `);
            }
        }
    };
}

export { bundleAnalyzer as default };
//# sourceMappingURL=index.js.map

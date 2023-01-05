<div align="center">
  <a href="https://rollupjs.org/guide/en/">
    <img width="200" height="200"
      src="https://raw.githubusercontent.com/Jerry2023/rollup-plugin-bundle-analyzer/main/assets/log.png">
  </a>
  <h1>rollup Bundle Analyzer</h1>
  <p>Visualize size of rollup output files with an interactive zoomable treemap.</p>
</div>

<h2 align="center">Install</h2>

```bash
# NPM
npm install --save-dev rollup-plugin-bundle-analyzer
# Yarn
yarn add -D rollup-plugin-bundle-analyzer
```

<h2 align="center">Usage (as a plugin)</h2>

```js
import bundleAnalyzer from "rollup-plugin-bundle-analyzer";


plugins: [
    bundleAnalyzer(),
    vue(),
]
```

It will create an interactive treemap visualization of the contents of all your bundles.

![rollup bundle analyzer zoomable treemap](https://cloud.githubusercontent.com/assets/302213/20628702/93f72404-b338-11e6-92d4-9a365550a701.gif)

This module will help you:

1. Realize what's *really* inside your bundle
2. Find out what modules make up the most of its size
3. Find modules that got there by mistake
4. Optimize it!

And the best thing is it supports minified bundles! It parses them to get real size of bundled modules.
And it also shows their gzipped sizes!

<h2 align="center">Options (for plugin)</h2>

```js
bundleAnalyzer(options?: object)
```

|Name|Type|Description|
|:--:|:--:|:----------|
|**`analyzerMode`**|One of: `server`, `static`, `json` | Default: `server`. In `server` mode analyzer will start HTTP server to show bundle report. In `static` mode single HTML file with bundle report will be generated. In `json` mode single JSON file with bundle report will be generated.
|**`host`**|`{String}`|Default: `127.0.0.1`. Host that will be used in `server` mode to start HTTP server.|
|**`port`**|`{Number}` or `auto`|Default: `9800`. Port that will be used in `server` mode to start HTTP server.|
|**`reportFilename`**|`{String}`|Default: `report.html`. Path to bundle report file that will be generated in `static` mode. It can be either an absolute path or a path relative to a bundle output directory |
|**`generateStatsFile`**|`{Boolean}`|Default: `false`. If `true`, rollup stats JSON file will be generated in bundle output directory|
|**`statsFilename`**|`{String}`|Default: `stats.json`. Name of rollup stats JSON file that will be generated if `generateStatsFile` is `true`. It can be either an absolute path or a path relative to a bundle output directory |
|**`excludeAssets`**|`{null\|pattern\|pattern[]}` where `pattern` equals to `{String\|RegExp\|function}`|Default: `null`. Patterns that will be used to match against asset names to exclude them from the report. If pattern is a string it will be converted to RegExp via `new RegExp(str)`. If pattern is a function it should have the following signature `(assetName: string) => boolean` and should return `true` to *exclude* matching asset. If multiple patterns are provided asset should match at least one of them to be excluded. |

### `input`

This is the "input" size of your files, before any transformations like
minification.

### `render`

This is the "output" size of your files. If you're using a rollup plugin such
as Uglify, then this value will reflect the minified size of your code.

### `gzip`

This is the size of running the parsed bundles/modules through gzip compression.

<h2 align="center">Selecting Which Chunks to Display</h2>

When opened, the report displays all of the chunks for your project. It's possible to filter to a more specific list of chunks by using the sidebar or the chunk context menu.

### Sidebar

The Sidebar Menu can be opened by clicking the `>` button at the top left of the report. You can select or deselect chunks to display under the "Show chunks" heading there.

### Chunk Context Menu

The Chunk Context Menu can be opened by right-clicking or `Ctrl`-clicking on a specific chunk in the report. It provides the following options:

* **Hide chunk:** Hides the selected chunk
* **Hide all other chunks:** Hides all chunks besides the selected one
* **Show all chunks:** Un-hides any hidden chunks, returning the report to its initial, unfiltered view

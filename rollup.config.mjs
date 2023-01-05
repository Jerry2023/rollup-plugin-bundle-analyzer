import { readFileSync } from 'fs';
import { builtinModules } from 'module';

// eslint-disable-next-line import/no-extraneous-dependencies
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

/**
 * Create a base rollup config
 * @param {Record<string,any>} pkg Imported package.json
 * @param {string[]} external Imported package.json
 * @returns {import('rollup').RollupOptions}
 */
export function createConfig({ pkg, external = [] }) {
  return {
    input: 'src/index.ts', external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(builtinModules)
      .concat(external), onwarn: (warning) => {
      throw Object.assign(new Error(), warning);
    }, strictDeprecations: true, output: [{
      format: 'cjs',
      file: pkg.main,
      exports: 'named',
      footer: 'module.exports = Object.assign(exports.default, exports);',
      sourcemap: true
    }, {
      format: 'es', file: pkg.module, plugins: [emitModulePackageFile()], sourcemap: true
    }], plugins: [typescript({ sourceMap: true }), nodeResolve(), commonjs()]
  };
}

export function emitModulePackageFile() {
  return {
    name: 'emit-module-package-file', generateBundle() {
      this.emitFile({
        type: 'asset', fileName: 'package.json', source: `{"type":"module"}`
      });
    }
  };
}


export default createConfig({
  pkg: JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
});

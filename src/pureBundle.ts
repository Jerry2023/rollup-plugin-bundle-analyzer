import { writeFileSync } from 'fs';
import path from 'path';
import { OutputBundle, OutputOptions } from 'rollup';

/**
 * 删除多余的key值，例如code, data这类比较长的内容，可以更方便观测生成的包数据结构
 * @param target 目标对象
 * @param delKey 要删除的key值
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore
function deleteKey(target: any, delKey: Array<string>): void {
  if (!target) {
    return;
  }
  for (const [key, value] of Object.entries(target)) {
    if ((typeof value === 'string' || Array.isArray(value)) && delKey.includes(key)) {
      const limit = Array.isArray(value) ? 5 : 300;
      if (value.length > 10) {
        target[key] = value.slice(0, limit);
      }
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      deleteKey(value, delKey);
    }
  }
}

export default function pureBundle(outputOptions: OutputOptions, outputBundle: OutputBundle) {
  const pureBundleInfo = JSON.parse(JSON.stringify(outputBundle));
  deleteKey(pureBundleInfo, ['code', 'data', 'source']);
  writeFileSync(path.join(process.cwd(), 'outputOpt.json'), JSON.stringify(outputOptions));
  writeFileSync(path.join(process.cwd(), 'bundle.json'), JSON.stringify(pureBundleInfo));
}

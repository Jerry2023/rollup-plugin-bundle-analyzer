import { TransformedModule } from '../../types';

export function getModulePathParts(moduleData: TransformedModule) {
  const projectRoot = process.cwd();
  const parsedPath = moduleData.name
    .replace(`${projectRoot}/`, '')
    .split('/')
    // Replacing `~` with `node_modules`
    .map((part) => (part === '~' ? 'node_modules' : part));
  return parsedPath.length ? parsedPath : null;
}

import _ from 'lodash';
import gzipSize from 'gzip-size';

import { TransformedModule } from '../../types';

import Module, { ModuleInstance } from './Module';
import Node, { NodeInstance } from './Node';
import { getModulePathParts } from './utils';

interface Stop {
  <T>(state: T): T;
}

export default class Folder extends Node {
  public children: {
    [key: string]: Folder | ModuleInstance;
  };
  private _code: string | undefined;
  private _originCode: string | undefined;
  private _size: number | undefined;
  private _renderSize: number | undefined;
  private _gzipSize: number | undefined;

  constructor(name: string, parent?: NodeInstance) {
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
      this._code = this.walk((node, code) => code + node.code ?? '', '', false);
    }

    return this._code;
  }

  get originCode() {
    if (!_.has(this, '_originCode')) {
      this._originCode = this.walk(
        (node, originCode) => originCode + node.originCode ?? '',
        '',
        false
      );
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

  getChild(name: string) {
    return this.children[name];
  }

  addChildModule(module: ModuleInstance) {
    const { name } = module;
    const currentChild = this.children[name];
    if (currentChild && currentChild instanceof Folder) return;
    // eslint-disable-next-line no-param-reassign
    module.parent = this;
    this.children[name] = module;

    delete this._size;
    delete this._code;
  }

  addChildFolder(folder: Folder) {
    this.children[folder.name] = folder;
    delete this._size;
    delete this._code;
    return folder;
  }

  walk(
    walker: (child: Folder | Module, state: any, stop: Stop) => any,
    state: any = {},
    deep: boolean | Stop = true
  ) {
    let stopped = false;

    function stop(finalState: any) {
      stopped = true;
      return finalState;
    }

    // eslint-disable-next-line consistent-return
    Object.values(this.children).forEach((child) => {
      if (deep && (child as Folder).walk) {
        // eslint-disable-next-line no-param-reassign
        state = (child as Folder).walk(walker, state, stop);
      } else {
        // eslint-disable-next-line no-param-reassign
        state = walker(child, state, stop);
      }

      if (stopped) return false;
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
          this.children = (onlyChild as Folder).children;
        } else {
          break;
        }
      }
    }

    this.walk(
      (child) => {
        // eslint-disable-next-line no-param-reassign
        child.parent = this;

        if ((child as Folder).mergeNestedFolders) {
          (child as Folder).mergeNestedFolders();
        }
      },
      null,
      false
    );
  }

  addModule(moduleData: TransformedModule) {
    const pathParts = getModulePathParts(moduleData);

    if (!pathParts) {
      return;
    }

    const [folders, fileName] = [pathParts.slice(0, -1), _.last(pathParts)];
    let currentFolder: Folder = this;

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

export type FolderInstance = InstanceType<typeof Folder>;

export function createModulesTree(modules: TransformedModule['modules']) {
  const root = new Folder('.');
  modules.forEach((module) => root.addModule(module));
  root.mergeNestedFolders();
  return root;
}

import _ from 'lodash';
import gzipSize from 'gzip-size';

import type { TransformedModule } from '../../types';
import { createBrotliSizeGetter } from '../size';

import Node from './Node';
import Folder from './Folder';

const sizeGetter = createBrotliSizeGetter();

export default class Module extends Node {
  private readonly data: TransformedModule;
  private _gzipSize: number | undefined;

  constructor(name: string, data: TransformedModule, parent: Folder) {
    super(name, parent);
    this.data = data;
  }

  get size() {
    return sizeGetter(this.originCode ?? '');
  }

  get code() {
    return this.data.code;
  }

  get originCode() {
    return this.data.originCode;
  }

  get renderSize() {
    return sizeGetter(this.data.code ?? '');
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

export type ModuleInstance = InstanceType<typeof Module>;

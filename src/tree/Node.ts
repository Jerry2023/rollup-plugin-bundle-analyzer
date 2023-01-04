export default class Node {
  name: string;
  public parent: Node | undefined;
  constructor(name: string, parent?: Node) {
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

export type NodeInstance = InstanceType<typeof Node>;

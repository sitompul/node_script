export class Rendezvous {
  private nodes: Map<string, number>;
  private nstr: string[];
  private nhash: bigint[];
  private hash: (s: string) => bigint;

  constructor(nodes: string[], hash: (s: string) => bigint) {
    console.log(nodes);
    this.nodes = new Map();
    this.nstr = new Array(nodes.length);
    this.nhash = new Array(nodes.length);
    this.hash = hash;

    nodes.forEach((node, i) => {
      this.nodes.set(node, i);
      this.nstr[i] = node;
      this.nhash[i] = hash(node);
    });
  }

  lookup(k: string): string {
    if (this.nodes.size === 0) return "";

    const khash = this.hash(k);
    let midx = 0;
    let mhash = this.xorshiftMult64(khash ^ this.nhash[0]);

    this.nhash.slice(1).forEach((nhash, i) => {
      const h = this.xorshiftMult64(khash ^ nhash);
      if (h > mhash) {
        midx = i + 1;
        mhash = h;
      }
    });

    return this.nstr[midx];
  }

  add(node: string): void {
    this.nodes.set(node, this.nstr.length);
    this.nstr.push(node);
    this.nhash.push(this.hash(node));
  }

  remove(node: string): void {
    const nidx = this.nodes.get(node);
    if (nidx === undefined) return;

    const l = this.nstr.length - 1;
    this.nstr[nidx] = this.nstr[l];
    this.nstr.pop();

    this.nhash[nidx] = this.nhash[l];
    this.nhash.pop();

    this.nodes.delete(node);
    if (nidx < l) {
      const moved = this.nstr[nidx];
      this.nodes.set(moved, nidx);
    }
  }

  private xorshiftMult64(x: bigint): bigint {
    x ^= x >> BigInt(12);
    x ^= x << BigInt(25);
    x ^= x >> BigInt(27);
    return x * BigInt("2685821657736338717");
  }
}


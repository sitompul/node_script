import { Xxh64 } from "@node-rs/xxhash";

// Mimic xxh64 hash on golang.
export function sum64String(input: string): BigInt {
  const xxh64 = new Xxh64();
  xxh64.update(input);
  const result = xxh64.digest();
  xxh64.reset();
  return result;
}

// Rendezvous Hashing (HRW) function
export function rendezvousHash(key: string, nodes: string[]): string {
  if (nodes.length === 0) return "";

  let bestNode: string = "";
  let highestScore: BigInt = 0n; // Initialize to a very small BigInt

  for (const node of nodes) {
    const score = sum64String(key + String(node)); // Hash (key + node)
    if (score > highestScore) {
      highestScore = score;
      bestNode = node;
    }
  }

  return bestNode;
}


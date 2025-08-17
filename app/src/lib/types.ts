export type Pos = "UTG"|"HJ"|"CO"|"BTN"|"SB"|"BB";
export type Action = "raise"|"call"|"fold";

export type Scenario =
  | { kind: "unopened"; hero: Exclude<Pos,"BB">; opener: "" }
  | { kind: "vs_open"; hero: Exclude<Pos,"UTG">; opener: Exclude<Pos,"BB"> };

export type Hand169 = string; // 'AKs' | 'AQo' | 'TT' etc.

export type AllowedMap = {
  // key: `${kind}|${hero}|${opener}|${hand}`
  [key: string]: Set<Action>;
};

export const ranks: readonly string[] = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

export function handKeyFromIJ(i: number, j: number): Hand169 {
  const hi = ranks[i], hj = ranks[j];
  if (i === j) return hi + hj;                  // pair
  const suited = j > i ? "s" : "o";             // upper triangle = suited
  const [r1, r2] = i < j ? [hi, hj] : [hj, hi]; // higher rank first
  return `${r1}${r2}${suited}`;
}

export function keyOf(s: Scenario, hand: Hand169): string {
  return `${s.kind}|${s.hero}|${"opener" in s ? (s as any).opener : ""}|${hand}`;
}

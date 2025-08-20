import type { AllowedMap, Action, Scenario } from "./types";
import { handKeyFromIJ } from "./types";
import * as XLSX from "xlsx";

let API_BASE = import.meta.env.VITE_ADVICE_API ?? "";
if (!API_BASE && typeof window !== "undefined") {
  const host = window.location.hostname;
  if (/github\.io$/i.test(host)) {
    API_BASE = "https://poker-preflop-trainer-advice.hamachiwrong.workers.dev";
  }
}
const ADVICE_URL = API_BASE ? `${API_BASE.replace(/\/$/, "")}/api/advice` : "/api/advice";

export type AdviceRequest = {
  scenario: Scenario;
  hand: string; // e.g., "AKs"
  userAction: Action;
  rangeMatrix: string[][]; // 13x13, each cell like "R", "R/C", "C", "C/F", "F", etc.
  openerRfiMatrix?: string[][]; // 13x13, openerのRFI（vs_open時のみ）
  summary?: AdviceSummary;
  heuristic?: HandHeuristic;
  handRankMatrix?: number[][]; // 13x13, each cell 1..10 (1 strongest)
  constraints?: AdviceConstraints;
};

export type AdviceConstraints = {
  thisHandAllowed: { raise: boolean; call: boolean; fold: boolean };
  examples: { raise: string[]; call: string[] };
};

export type AdviceSummary = {
  totalCells: number;
  counts: Record<string, number>; // keys like R, C, F, R/C, C/F, R/F, R/C/F
  heroEnterPercent: number;       // (R or C present)
  heroRaisePercent: number;       // (R present)
  heroCallPercent: number;        // (C present)
  openerRfiPercent?: number;      // (vs_open時) opener の R 割合（セル比率）
  handLabel: string;              // このハンドの略記 (R / C / F / R/C / C/F / R/F / R/C/F)
  // === 追加: コンボ（組合せ）重み付けの比率 ===
  totalCombos: number;            // 常に1326想定
  heroEnterCombosPercent: number;
  heroRaiseCombosPercent: number;
  heroCallCombosPercent: number;
  openerRfiCombosPercent?: number;
};

export type HandHeuristic = {
  ranksum: number;              // A=14 ... 2=2 の合計
  pair: boolean;
  suited: boolean;
  gap: number;                  // ランク差（0=pair, 1=隣接, ...）
  connectednessScore: number;   // 近さの評価（例: 0..3）
  axSuited: boolean;            // Axs か
  wheelPotential: boolean;      // A5s/A4s などのホイール
  score: number;                // 総合スコア（簡易）
  label: 'strong'|'medium'|'weak';
  rankBucket?: number;          // 1(最強)-10(最弱)
};

export async function fetchAdvice(params: AdviceRequest): Promise<string> {
  const res = await fetch(ADVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Advice API error: ${res.status}`);
  }
  try {
    const data = JSON.parse(text);
    return (data?.advice as string) ?? "";
  } catch {
    return text;
  }
}

export function buildRangeMatrixForScenario(allowed: AllowedMap, scenario: Scenario): string[][] {
  const out: string[][] = [];
  const prefix = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|`;
  for (let i = 0; i < 13; i++) {
    const row: string[] = [];
    for (let j = 0; j < 13; j++) {
      const hand = handKeyFromIJ(i, j);
      const acts = allowed[prefix + hand] ?? new Set<Action>(["fold"] as Action[]);
      const parts: string[] = [];
      if (acts.has("raise")) parts.push("R");
      if (acts.has("call")) parts.push("C");
      if (acts.has("fold")) parts.push("F");
      row.push(parts.join("/"));
    }
    out.push(row);
  }
  return out;
}

export function buildRfiMatrixForPos(allowed: AllowedMap, pos: string): string[][] {
  const out: string[][] = [];
  const prefix = `unopened|${pos}||`;
  for (let i = 0; i < 13; i++) {
    const row: string[] = [];
    for (let j = 0; j < 13; j++) {
      const hand = handKeyFromIJ(i, j);
      const acts = allowed[prefix + hand] ?? new Set<Action>();
      const hasRaise = acts.has("raise");
      row.push(hasRaise ? "R" : "-");
    }
    out.push(row);
  }
  return out;
}

function labelFromActs(acts: Set<Action>): string {
  const parts: string[] = [];
  if (acts.has("raise")) parts.push("R");
  if (acts.has("call")) parts.push("C");
  if (acts.has("fold")) parts.push("F");
  return parts.join("/");
}

function combosForHandKey(hand: string): number {
  // 'TT' pair → 6, 'AKs' suited → 4, 'AQo' offsuit → 12
  if (hand.length < 2) return 0;
  const r1 = hand[0], r2 = hand[1];
  const tag = hand[2] ?? "";
  if (r1 === r2) return 6;
  if (tag === "s") return 4;
  return 12;
}

export function summarizeScenario(allowed: AllowedMap, scenario: Scenario, hand: string, openerRfi?: string[][]): AdviceSummary {
  const prefix = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|`;
  let total = 0;
  const counts: Record<string, number> = {};
  let enter = 0, raise = 0, call = 0;
  // combo-weighted
  const TOTAL_COMBOS = 1326;
  let enterCombos = 0, raiseCombos = 0, callCombos = 0;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      total++;
      const hkey = handKeyFromIJ(i, j);
      const acts = allowed[prefix + hkey] ?? new Set<Action>(["fold"] as Action[]);
      const hasR = acts.has("raise");
      const hasC = acts.has("call");
      const label = labelFromActs(acts) || "F";
      counts[label] = (counts[label] ?? 0) + 1;
      if (hasR || hasC) enter++;
      if (hasR) raise++;
      if (hasC) call++;
      const w = combosForHandKey(hkey);
      if (hasR || hasC) enterCombos += w;
      if (hasR) raiseCombos += w;
      if (hasC) callCombos += w;
    }
  }
  let openerRfiPercent: number | undefined = undefined;
  let openerRfiCombosPercent: number | undefined = undefined;
  if (openerRfi) {
    let rcells = 0, tot = 0;
    let rCombos = 0, totCombos = 0;
    for (let i = 0; i < openerRfi.length; i++) {
      for (let j = 0; j < openerRfi[i].length; j++) {
        tot++;
        const hkey = handKeyFromIJ(i, j);
        const w = combosForHandKey(hkey);
        totCombos += w;
        if (openerRfi[i][j] === "R") { rcells++; rCombos += w; }
      }
    }
    openerRfiPercent = tot ? (rcells / tot) * 100 : 0;
    openerRfiCombosPercent = totCombos ? (rCombos / totCombos) * 100 : 0;
  }
  const actsForHand = allowed[prefix + hand] ?? new Set<Action>(["fold"] as Action[]);
  return {
    totalCells: total,
    counts,
    heroEnterPercent: (enter / total) * 100,
    heroRaisePercent: (raise / total) * 100,
    heroCallPercent: (call / total) * 100,
    openerRfiPercent,
    handLabel: labelFromActs(actsForHand) || "F",
    totalCombos: TOTAL_COMBOS,
    heroEnterCombosPercent: (enterCombos / TOTAL_COMBOS) * 100,
    heroRaiseCombosPercent: (raiseCombos / TOTAL_COMBOS) * 100,
    heroCallCombosPercent: (callCombos / TOTAL_COMBOS) * 100,
    openerRfiCombosPercent,
  };
}

function rankValue(r: string): number {
  const map: Record<string, number> = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 };
  return map[r] ?? 0;
}

export function computeHandHeuristic(hand: string): HandHeuristic {
  const r1 = hand[0]; const r2 = hand[1]; const tag = hand[2] ?? '';
  const v1 = rankValue(r1); const v2 = rankValue(r2);
  const pair = r1 === r2;
  const suited = tag === 's';
  const gap = pair ? 0 : Math.abs(v1 - v2);
  // 連結度: 隣接=最大、1ギャップ=中、2ギャップ=小 それ以外=0
  const connectednessScore = pair ? 0 : (gap === 1 ? 3 : gap === 2 ? 2 : gap === 3 ? 1 : 0);
  const axSuited = suited && (r1 === 'A' || r2 === 'A');
  const wheelPotential = axSuited && ((r1 === '5' || r2 === '5') || (r1 === '4' || r2 === '4'));
  const ranksum = v1 + v2;
  // 簡易スコア: ランク合計 + ペア補正 + スーテッド + 連結 + Axs + wheel
  let score = ranksum;
  if (pair) {
    // ペアは基礎点が高い。ランクに応じて上乗せ
    score += 6 + Math.max(v1, v2) * 0.3;
  }
  if (suited) score += 1.5;
  score += connectednessScore * 0.8;
  if (axSuited) score += 1.0;
  if (wheelPotential) score += 0.8; // A5s等をA6sより優遇
  // ラベル分類（経験則ベース）
  const label: HandHeuristic['label'] = score >= 26 ? 'strong' : score >= 22 ? 'medium' : 'weak';
  return { ranksum, pair, suited, gap, connectednessScore, axSuited, wheelPotential, score, label };
}

// ===== Hand Rank table (1=最強 .. 10=最弱) =====
// HandRank.xlsx に対応する固定テーブル。必要に応じてAPI/静的JSONに置換可。
// キーは 13x13 の handKeyFromIJ 形式（例: AA, AKs, AKo ...）
export const HAND_RANK_BUCKET: Record<string, number> = {
  // 代表例のみ記載。実運用では全169キーを埋める/別JSONで管理
  AA: 1, KK: 1, QQ: 1, JJ: 2, TT: 2,
  AKs: 1, AQs: 2, AJs: 2, ATs: 3, A9s: 3, A8s: 4, A7s: 4, A6s: 4, A5s: 3, A4s: 4, A3s: 5, A2s: 5,
  AKo: 2, AQo: 3, AJo: 4, ATo: 4,
  KQs: 2, KJs: 3, QJs: 3, JTs: 3,
  // ...（省略）
};

export function attachRankBucket(h: HandHeuristic, hand: string): HandHeuristic {
  const bucket = HAND_RANK_BUCKET[hand] ?? undefined;
  return { ...h, rankBucket: bucket };
}

// ===== HandRank.xlsx loader (13x13 matrix of 1..10) =====
let handRankCache: number[][] | null = null;

function isHeaderRow(row: any[]): boolean {
  const HEADER = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
  if (!row) return false;
  const slice = (row as any[]).slice(1, 14).map(v => String(v ?? "").trim());
  return JSON.stringify(slice) === JSON.stringify(HEADER);
}

export async function loadHandRankMatrix(): Promise<number[][]> {
  if (handRankCache) return handRankCache;
  // Try GitHub Pages base first, then root for dev
  const tryUrls = [
    "/poker-preflop-trainer/HandRank.xlsx",
    "/HandRank.xlsx",
  ];
  let buf: ArrayBuffer | null = null;
  for (const u of tryUrls) {
    try {
      const res = await fetch(u);
      if (res.ok) { buf = await res.arrayBuffer(); break; }
    } catch { /* continue */ }
  }
  if (!buf) throw new Error("HandRank.xlsx fetch failed");
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  // find header
  let headerIndex = -1;
  for (let r = 0; r < rows.length; r++) {
    if (isHeaderRow(rows[r])) { headerIndex = r; break; }
  }
  if (headerIndex < 0) throw new Error("HandRank.xlsx header not found");
  const out: number[][] = [];
  for (let i = 0; i < 13; i++) {
    const row = rows[headerIndex + 1 + i] ?? [];
    const line: number[] = [];
    for (let j = 0; j < 13; j++) {
      const v = row[1 + j];
      const n = Number(v);
      line.push(Number.isFinite(n) ? n : 10);
    }
    out.push(line);
  }
  handRankCache = out;
  return out;
}

// ==== Helpers to build constraints/examples ====
export function deriveAllowedForHand(allowed: AllowedMap, scenario: Scenario, hand: string): { raise: boolean; call: boolean; fold: boolean } {
  const key = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|${hand}`;
  const set = allowed[key] ?? new Set<Action>();
  return { raise: set.has("raise"), call: set.has("call"), fold: set.size === 0 || set.has("fold") };
}

export function extractExamples(rangeMatrix: string[][], kind: 'raise'|'call', limit = 6): string[] {
  const hands: string[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const cell = (rangeMatrix[i]?.[j] ?? '').toUpperCase();
      const hasR = cell.includes('R');
      const hasC = cell.includes('C');
      if (kind === 'raise' && hasR) hands.push(handKeyFromIJ(i, j));
      if (kind === 'call' && hasC) hands.push(handKeyFromIJ(i, j));
      if (hands.length >= limit) return hands;
    }
  }
  return hands;
}



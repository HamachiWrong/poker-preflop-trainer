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
  // 最小要件に合わせ、以下は任意。サーバは first line に summary（combo重み%）を使用。
  summary?: AdviceSummary; // combo-weighted
  constraints?: AdviceConstraints; // contains thisHandAllowed
  handRankBucket?: number; // 1 strongest .. 10 weakest
  hints?: string[]; // strategy hints
};

export type AdviceConstraints = {
  thisHandAllowed: { raise: boolean; call: boolean; fold: boolean };
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

// removed: HandHeuristic and related helpers (not needed for advice)

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

// removed: matrix builders (not needed for advice)

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

export function summarizeScenario(allowed: AllowedMap, scenario: Scenario, hand: string): AdviceSummary {
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
  if (scenario.kind === 'vs_open') {
    const opener = (scenario as any).opener as string;
    const prefixOpen = `unopened|${opener}||`;
    let rcells = 0, tot = 0;
    let rCombos = 0, totCombos = 0;
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        tot++;
        const hkey = handKeyFromIJ(i, j);
        const acts = allowed[prefixOpen + hkey] ?? new Set<Action>();
        const w = combosForHandKey(hkey);
        totCombos += w;
        if (acts.has('raise')) { rcells++; rCombos += w; }
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

// ==== Helpers to build constraints/examples ====
export function deriveAllowedForHand(allowed: AllowedMap, scenario: Scenario, hand: string): { raise: boolean; call: boolean; fold: boolean } {
  const key = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|${hand}`;
  const set = allowed[key] ?? new Set<Action>();
  return { raise: set.has("raise"), call: set.has("call"), fold: set.size === 0 || set.has("fold") };
}

// ========== HandRank loading (1 strongest .. 10 weakest) ==========
let handRankCache: number[][] | null = null;

async function loadHandRankMatrix(): Promise<number[][]> {
  if (handRankCache) return handRankCache;
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
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  const HEADER = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
  let headerIndex = -1;
  for (let r = 0; r < rows.length; r++) {
    const slice = (rows[r] ?? []).slice(1, 14).map(v => String(v ?? "").trim());
    if (JSON.stringify(slice) === JSON.stringify(HEADER)) { headerIndex = r; break; }
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

export async function loadHandRankBucketFor(hand: string): Promise<number | undefined> {
  const m = await loadHandRankMatrix().catch(() => null);
  if (!m) return undefined;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      if (handKeyFromIJ(i, j) === hand) return m[i][j];
    }
  }
  return undefined;
}

// ========== Strategy hints (max 2) ==========
function handCategory(hand: string): { pair: boolean; suited: boolean; ax: boolean } {
  const r1 = hand[0]; const r2 = hand[1]; const tag = hand[2] ?? "";
  const pair = r1 === r2;
  const suited = tag === "s";
  const ax = r1 === "A" || r2 === "A";
  return { pair, suited, ax };
}

export function buildStrategyHints(scenario: Scenario, summary: AdviceSummary, hand: string, handRankBucket?: number): string[] {
  const hints: string[] = [];
  const openPct = Math.round(summary.openerRfiCombosPercent ?? summary.openerRfiPercent ?? 0);
  const cat = handCategory(hand);
  if (scenario.kind === "vs_open") {
    const hero = (scenario as any).hero as string;
    const opener = (scenario as any).opener as string;

    // 大枠：線形/ポラー
    if (hero === "BB" && opener === "BTN") {
      hints.push("BBはコールで守るハンドが多く、3betはポラー寄り。中位域の一部をコールに残し、弱いスーテッド/コネクタは降ろす設計。");
    } else if (["CO","BTN","HJ"].includes(hero) && ["UTG","HJ","CO"].includes(opener) && openPct <= 20) {
      hints.push("オープンが狭い前方レンジにはリニア寄りに3betで圧力。中位〜強めを押し上げ、弱いハンドは降ろす。");
    } else if (hero === "SB" && ["HJ","CO","BTN"].includes(opener) && openPct >= 20) {
      // 修正指示: SB は OOP でコールEV低下 → 3bet 比重を置いたリニア構築（HJ含む）
      hints.push("SBはポジション不利でコールのEVが落ちるため、3betに比重を置いたリニアレンジで構築。");
    } else if (hero === "BTN" && ["CO","HJ"].includes(opener)) {
      hints.push("ポジション有利のため、コールと3betの配分はややリニア。バリューで押し上げつつ、コールも十分に残す。");
    }

    // ハンド固有視点（HandRank: 1 strongest .. 10 weakest）
    if (typeof handRankBucket === 'number') {
      if (handRankBucket <= 3) {
        hints.push("上位レンジに位置し、バリューとして3betに回しやすいクラス。");
      } else if (cat.pair && handRankBucket <= 5) {
        hints.push("中位ペアは翻弄されやすく、相手レンジの広さとポジションに応じてコール/3betの分割が有効。");
      }
    }
    if (cat.ax && cat.suited) {
      hints.push("Aブロッカーとスーテッドでプレイアビリティが高く、コール/3bet双方で柔軟に機能。");
    }
  }
  return hints.slice(0, 2);
}



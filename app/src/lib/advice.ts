import type { AllowedMap, Action, Scenario } from "./types";
import { handKeyFromIJ } from "./types";

export type AdviceRequest = {
  scenario: Scenario;
  hand: string; // e.g., "AKs"
  userAction: Action;
  rangeMatrix: string[][]; // 13x13, each cell like "R", "R/C", "C", "C/F", "F", etc.
  openerRfiMatrix?: string[][]; // 13x13, openerのRFI（vs_open時のみ）
  summary?: AdviceSummary;
};

export type AdviceSummary = {
  totalCells: number;
  counts: Record<string, number>; // keys like R, C, F, R/C, C/F, R/F, R/C/F
  heroEnterPercent: number;       // (R or C present)
  heroRaisePercent: number;       // (R present)
  heroCallPercent: number;        // (C present)
  openerRfiPercent?: number;      // (vs_open時) opener の R 割合
  handLabel: string;              // このハンドの略記 (R / C / F / R/C / C/F / R/F / R/C/F)
};

export async function fetchAdvice(params: AdviceRequest): Promise<string> {
  const res = await fetch("/api/advice", {
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

export function summarizeScenario(allowed: AllowedMap, scenario: Scenario, hand: string, openerRfi?: string[][]): AdviceSummary {
  const prefix = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|`;
  let total = 0;
  const counts: Record<string, number> = {};
  let enter = 0, raise = 0, call = 0;
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
    }
  }
  let openerRfiPercent: number | undefined = undefined;
  if (openerRfi) {
    let rcells = 0, tot = 0;
    for (let i = 0; i < openerRfi.length; i++) {
      for (let j = 0; j < openerRfi[i].length; j++) {
        tot++;
        if (openerRfi[i][j] === "R") rcells++;
      }
    }
    openerRfiPercent = tot ? (rcells / tot) * 100 : 0;
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
  };
}



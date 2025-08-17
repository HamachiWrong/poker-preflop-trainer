import * as XLSX from "xlsx";
import { ranks, handKeyFromIJ } from "./types";        // 値
import type { AllowedMap, Action } from "./types";     // 型（type-only）

const HEADER = ranks;

function isHeaderRow(row: any[]): boolean {
  if (!row) return false;
  const slice = (row as any[]).slice(1, 14).map(v => String(v ?? "").trim());
  return JSON.stringify(slice) === JSON.stringify(HEADER);
}

function cellToActions(cellRaw: any, allowCall: boolean): Set<Action> {
  const s = String(cellRaw ?? "").toUpperCase().trim();
  if (!s) return new Set();
  const tokens = s.split("/").map(t => t.trim()).filter(Boolean);
  const out = new Set<Action>();
  for (const t of tokens) {
    const m = t.match(/^([RCF])\s*(\d+(\.\d+)?)?$/);
    if (!m) continue;
    const L = m[1];
    if (L === "R") out.add("raise");
    if (L === "C" && allowCall) out.add("call");
    if (L === "F") out.add("fold");
  }
  return out;
}

export async function parseExcelArrayBuffer(buf: ArrayBuffer): Promise<AllowedMap> {
  const wb = XLSX.read(buf, { type: "array" });
  const allowed: AllowedMap = {};

  function put(
    kind: "unopened"|"vs_open",
    hero: string,
    opener: string,
    i: number,
    j: number,
    cell: any,
    allowCall: boolean
  ) {
    const acts = cellToActions(cell, allowCall);
    if (acts.size === 0) return; // 空セルは出題対象外

    // 念のため AA/KK から fold を除外（誤検出対策）
    if (i === 0 && j === 0) acts.delete("fold"); // AA
    if (i === 1 && j === 1) acts.delete("fold"); // KK

    const hand = handKeyFromIJ(i, j);
    const key = `${kind}|${hero}|${opener}|${hand}`;
    allowed[key] = acts;
  }

  // --- RFI シート（タイトル→ヘッダ行→13行） ---
  if (wb.SheetNames.includes("RFI")) {
    const ws = wb.Sheets["RFI"];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
    for (let r = 0; r < rows.length; r++) {
      if (!isHeaderRow(rows[r])) continue;

      // タイトルから pos を推定（1〜2行上）
      let pos = "UTG";
      for (const up of [1, 2]) {
        const t = String(rows[r - up]?.[0] ?? "");
        const m = t.match(/RFI:\s*(UTG|HJ|CO|BTN|SB)/i);
        if (m) { pos = m[1].toUpperCase(); break; }
      }

      for (let i = 0; i < 13; i++) {
        const row = rows[r + 1 + i] ?? [];
        for (let j = 0; j < 13; j++) {
          put("unopened", pos, "", i, j, row[1 + j], /*allowCall*/ false);
        }
      }
      r += 13;
    }
  }

  // --- VsOpen シート（タイトル→ヘッダ行→13行） ---
  if (wb.SheetNames.includes("VsOpen")) {
    const ws = wb.Sheets["VsOpen"];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
    for (let r = 0; r < rows.length; r++) {
      if (!isHeaderRow(rows[r])) continue;

      // タイトルから hero/opener を推定（1〜2行上）
      let hero = "HJ", opener = "UTG";
      for (const up of [1, 2]) {
        const t = String(rows[r - up]?.[0] ?? "");
        const m = t.match(/VsOpen:\s*(UTG|HJ|CO|BTN|SB|BB)\s*vs\s*(UTG|HJ|CO|BTN|SB|BB)/i);
        if (m) { hero = m[1].toUpperCase(); opener = m[2].toUpperCase(); break; }
      }

      for (let i = 0; i < 13; i++) {
        const row = rows[r + 1 + i] ?? [];
        for (let j = 0; j < 13; j++) {
          put("vs_open", hero, opener, i, j, row[1 + j], /*allowCall*/ true);
        }
      }
      r += 13;
    }
  }

  return allowed;
}

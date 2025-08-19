import type { AllowedMap, Action, Scenario } from "../../lib/types";
import { ranks, handKeyFromIJ, keyOf } from "../../lib/types";

type Props = {
  allowedMap: AllowedMap;
  scenario: Scenario;
  highlightHand?: string; // e.g., "AKs"
};

function actionsKey(acts: Set<Action>): string {
  const order: Action[] = ["raise", "call", "fold"];
  return order.filter(a => acts.has(a)).join("/");
}

function colorForActions(acts: Set<Action>): string {
  const a = actsKeyed(acts);
  switch (a) {
    case "raise": return "#e53935";            // 赤
    case "raise/call": return "#fb8c00";      // オレンジ
    case "call": return "#43a047";            // 緑
    case "call/fold": return "#7cb342";       // 黄緑
    case "fold": return "#1e88e5";            // 青
    case "raise/fold": return "#8e24aa";      // 赤→青の中間（紫）
    case "raise/call/fold": return "#5e35b1"; // 3択（やや青寄りの紫）
    default: return "#1e88e5";                  // デフォルトは青（fold相当）
  }
}

function actsKeyed(acts: Set<Action>): string {
  return ["raise", "call", "fold"].filter(a => acts.has(a as Action)).join("/");
}

function labelForActions(acts: Set<Action>): string {
  const parts: string[] = [];
  if (acts.has("raise")) parts.push("Raise");
  if (acts.has("call")) parts.push("Call");
  if (acts.has("fold")) parts.push("Fold");
  return parts.join("/");
}

export default function RangeGrid({ allowedMap, scenario, highlightHand }: Props) {
  // 指定シナリオの全ハンドを収集（存在しない=空セルは Fold とみなす）
  const scenarioPrefix = `${scenario.kind}|${scenario.hero}|${"opener" in scenario ? (scenario as any).opener : ""}|`;

  // 13x13 を描画
  return (
    <div>
      <div className="text-sm font-bold mb-2">参照レンジ</div>
      <div className="inline-grid" style={{ gridTemplateColumns: "auto repeat(13, minmax(0, 1fr))" }}>
        {/* ヘッダ行（横軸） */}
        <div className="text-[11px] font-semibold text-zinc-600 px-1 py-0.5"></div>
        {ranks.map(r => (
          <div key={"top-"+r} className="text-[11px] font-semibold text-zinc-600 px-1 py-0.5 text-center">{r}</div>
        ))}

        {/* 本体 */}
        {ranks.map((ri, i) => (
          <>
            <div key={"left-"+ri} className="text-[11px] font-semibold text-zinc-600 px-1 py-0.5">{ri}</div>
            {ranks.map((rj, j) => {
              const hand = handKeyFromIJ(i, j);
              const key = scenarioPrefix + hand;
              const acts = allowedMap[key] ?? new Set<Action>(["fold"] as Action[]);
              const bg = colorForActions(acts);
              const label = labelForActions(acts);
              const isHL = highlightHand === hand;
              return (
                <div
                  key={hand}
                  className={`border rounded-sm flex items-center justify-center p-1 ${isHL ? 'relative z-20 blink-outline' : ''}`}
                  style={{ background: bg, borderColor: 'rgba(255,255,255,.3)' }}
                >
                  <div className="text-white text-[10px] leading-[1.05] font-bold drop-shadow text-center">
                    <div>{hand}</div>
                    <div>{label}</div>
                  </div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}



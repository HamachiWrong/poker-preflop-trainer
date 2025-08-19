import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadRanges from "./UploadRanges";
import { useStore } from "../state/store";
import type { Action, Scenario } from "../lib/types";
import Header from "../components/Header";
import CardShell from "../components/ui/Card";
import Button from "../components/ui/Button";
import HandCard from "../components/poker/HandCard";
import RangeGrid from "../components/poker/RangeGrid";
// レイザーのカード/チップは表示しないのでインポート不要
// import ChipStack from "../components/poker/ChipStack";

/** 6-maxの席順（時計回り） */
const ORDER: Array<Scenario["hero"]> = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

/** 座標：0=HERO下央、右下→右上→上央→左上→左下 */
function slotCoords(slot: 0|1|2|3|4|5) {
  const map = {
    0: { top:"82%", left:"50%" },
    1: { top:"68%", left:"84%" },
    2: { top:"24%", left:"84%" },
    3: { top:"8%",  left:"50%" },
    4: { top:"24%", left:"16%" },
    5: { top:"68%", left:"16%" },
  } as const;
  return map[slot];
}

/** 席の“中心→卓中心(50%,50%)”の向き（重なり防止用オフセット） */
function dirToCenter(slot: 1|2|3|4|5) {
  const d = {
    1: { x: -1, y: -0.55 },
    2: { x: -1, y:  0.55 },
    3: { x:  0, y:  1    },
    4: { x:  1, y:  0.55 },
    5: { x:  1, y: -0.55 },
  }[slot];
  const len = Math.hypot(d.x, d.y);
  return { x: d.x/len, y: d.y/len };
}
function towardCenter(slot: 1|2|3|4|5, dist: number) {
  const v = dirToCenter(slot);
  const dx = v.x * dist, dy = v.y * dist;
  return { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)` };
}

/** HERO固定で右下→右上→上央→左上→左下 */
function neighborsFrom(hero: Scenario["hero"]) {
  const i = ORDER.indexOf(hero);
  const prev1 = ORDER[(i - 1 + 6) % 6];
  const prev2 = ORDER[(i - 2 + 6) % 6];
  const prev3 = ORDER[(i - 3 + 6) % 6];
  const next2 = ORDER[(i + 2) % 6];
  const next1 = ORDER[(i + 1) % 6];
  return [prev1, prev2, prev3, next2, next1] as const;
}

/** UTG→HERO直前 までの全席 */
function beforeHeroSet(hero: Scenario["hero"]) {
  const set = new Set<Scenario["hero"]>();
  let i = 0; // UTGから
  while (ORDER[i] !== hero) { set.add(ORDER[i]); i = (i + 1) % 6; }
  return set;
}

/** RFI：UTG→HERO直前 すべて Fold */
function foldedBeforeHeroRFI(hero: Scenario["hero"]) {
  return beforeHeroSet(hero);
}

const seatClass: Record<Scenario["hero"], string> = {
  UTG: "seat-badge seat-utg",
  HJ:  "seat-badge seat-hj",
  CO:  "seat-badge seat-co",
  BTN: "seat-badge seat-btn",
  SB:  "seat-badge seat-sb",
  BB:  "seat-badge seat-bb",
};

export default function Play() {
  const nav = useNavigate();
  const allowed = useStore(s => s.allowed);
  const { question, nextQuestion, answer } = useStore();
  const studyFilter = useStore(s => s.studyFilter);
  const [feedback, setFeedback] = useState<null | { correct: boolean; allowed: Set<Action> }>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  // ブラウザ更新などで /play に直アクセスした場合：
  // 1) 即座に初期画面のUIをレンダリング（白画面を避ける）
  // 2) 初回ペイント後にハッシュのみ置き換え（URLも初期画面に）
  useEffect(() => {
    if (!allowed && window.location.hash !== "#/") {
      window.location.replace("#/");
    }
  }, [allowed]);

  if (!allowed) {
    return <UploadRanges />;
  }

  // 初回＆モード切替時：必ず新しい問題を引く（フック順安定）
  useEffect(() => {
    if (!allowed) return;
    nextQuestion(studyFilter ?? undefined);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, studyFilter]);

  if (!question) {
    return (
      <div className="body-bg">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
          <CardShell>問題を生成中…（初回は数秒かかることがあります）</CardShell>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => nav('/')}>モード選択に戻る</Button>
          </div>
        </main>
      </div>
    );
  }

  const { scenario, hand } = question;

  // 表示用セット：Fold対象・レイザー
  const opener = scenario.kind === "vs_open" ? scenario.opener : null;

  // === 要件①：vsOpenは「UTG→HERO直前」のうち、オープナー以外は全員 Fold ===
  // RFI は従来どおり「UTG→HERO直前」全員 Fold
  const foldedSet = (() => {
    if (scenario.kind === "unopened") return foldedBeforeHeroRFI(scenario.hero);
    if (!opener) return new Set<Scenario["hero"]>();
    const set = beforeHeroSet(scenario.hero);
    set.delete(opener); // オープナーはFoldではなくRaise表記
    return set;
  })();

  // タイトル
  const title = scenario.kind === "unopened"
    ? `${scenario.hero} / ${hand}`
    : `${scenario.hero} (Hero) vs ${scenario.opener} / ${hand}`;

  // アクション
  const actions = scenario.kind === "unopened"
    ? [
        { label: "Raise (2.5bb)", action: "raise" as const },
        { label: "Fold", action: "fold" as const },
      ]
    : [
        { label: "3bet (Raise)", action: "raise" as const },
        { label: "Call",  action: "call"  as const },
        { label: "Fold",  action: "fold"  as const },
      ];

  function pick(a: Action) {
    const res = answer(a);
    if (!res) return;
    setSelectedAction(a);
    setFeedback(res);
  }
  function next() {
    setFeedback(null);
    setSelectedAction(null);
    nextQuestion(studyFilter ?? undefined);
  }

  const neighborList = neighborsFrom(scenario.hero);

  return (
    <div className="body-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>

        {/* 卓 */}
        <div className="relative mx-auto w-full max-w-3xl h-80 md:h-[28rem]">
          <div className="poker-table w-full h-full"></div>

          {/* HERO */}
          {(() => {
            const c = slotCoords(0);
            return (
              <div
                className="absolute flex flex-col items-center gap-2"
                style={{ top: c.top, left: c.left, transform: "translate(-50%, -50%)" }}
              >
                <HandCard hand={hand} />
                <span className="hero-pill">HERO {scenario.hero}</span>
              </div>
            );
          })()}

          {/* 他席 */}
          {neighborList.map((pos, idx) => {
            const slot = (idx + 1) as 1|2|3|4|5;
            const c = slotCoords(slot);
            const isBTN = pos === "BTN";
            const isSB  = pos === "SB";
            const isBB  = pos === "BB";
            const isOpener = opener === pos;
            const isFolded = foldedSet.has(pos);

            const badgeClass = isFolded ? "seat-badge seat-fold" : seatClass[pos];

            // SB/BB のブラインド表記は常時。ただし「SBがレイズ=opener」のときは 0.5BB を隠す
            const showSBBlind = isSB && !(scenario.kind === "vs_open" && isOpener);
            const showBBBlind = isBB; // BBは常時

            return (
              <div
                key={pos}
                className="absolute"
                style={{ top: c.top, left: c.left, transform: "translate(-50%, -50%)" }}
              >
                {/* バッジ */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`${badgeClass} select-none`}>{pos}</div>

                  {/* 要件②：バッジ下のテキスト（Fold / Raise） */}
                  {isFolded && (
                    <div className="mt-1 text-[11px] text-zinc-200/90 font-semibold drop-shadow">
                      {pos} Fold
                    </div>
                  )}
                  {isOpener && scenario.kind === "vs_open" && (
                    <div className="mt-1 text-[11px] text-amber-300 font-semibold drop-shadow">
                      {pos} Raise
                    </div>
                  )}
                </div>

                {/* SB/BB blind ラベル */}
                {showSBBlind && (
                  <div className="pointer-events-none absolute z-25 left-1/2 top-1/2" style={towardCenter(slot, 72)}>
                    <span className="bb-label">0.5BB</span>
                  </div>
                )}
                {showBBBlind && (
                  <div className="pointer-events-none absolute z-25 left-1/2 top-1/2" style={towardCenter(slot, 72)}>
                    <span className="bb-label">1BB</span>
                  </div>
                )}

                {/* 要件③：オープナーは 2.5BB ラベルのみ（カード/チップは表示しない） */}
                {isOpener && scenario.kind === "vs_open" && (
                  <div className="pointer-events-none absolute z-25 left-1/2 top-1/2" style={towardCenter(slot, 72)}>
                    <span className="bb-label">2.5BB</span>
                  </div>
                )}

                {/* BTN（D） */}
                {isBTN && (
                  <div className="pointer-events-none absolute z-50 left-1/2 top-1/2" style={towardCenter(slot, 60)}>
                    <div className="dealer-chip">D</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* アクション */}
        <CardShell>
          <div className="action-row">
            {actions.map(b => {
              const isSelected = selectedAction === b.action;
              return (
                <Button
                  key={b.action}
                  onClick={() => pick(b.action)}
                  variant={isSelected ? "ghost" : "primary"}
                  className={`min-w-[150px] ${isSelected ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-200 border border-zinc-300 cursor-default" : ""}`}
                >
                  {b.label}
                </Button>
              );
            })}
          </div>

          {feedback && (
            <div className={`mt-4 p-3 rounded-xl border ${feedback.correct ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <p className="font-semibold">{feedback.correct ? "✅ 正解！" : "❌ 不正解"}</p>
              <div className="mt-3 flex justify-center">
                <Button onClick={next} className="min-w-[160px]">次の問題へ</Button>
              </div>

              <div className="mt-4 overflow-auto">
                <RangeGrid allowedMap={allowed!} scenario={scenario} highlightHand={hand} />
              </div>
            </div>
          )}
        </CardShell>
      </main>
    </div>
  );
}

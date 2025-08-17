import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { Action, Scenario } from "../lib/types";
import Header from "../components/Header";
import CardShell from "../components/ui/Card";
import Button from "../components/ui/Button";
import HandCard from "../components/poker/HandCard";
import CardBackPair from "../components/poker/CardBackPair";
import ChipStack from "../components/poker/ChipStack";

/** 6-maxの席順（必ずこの時計回りを守る） */
const ORDER: Array<Scenario["hero"]> = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

/** スロット座標（0=HERO下央、時計回りに1..5。※右→上→左へ進む=CCW表示） */
function slotCoords(slot: 0|1|2|3|4|5) {
  const map = {
    0: { top:"82%", left:"50%" },  // HERO
    1: { top:"68%", left:"84%" },  // 右下（=ヒーローの右隣）
    2: { top:"24%", left:"84%" },  // 右上
    3: { top:"8%",  left:"50%" },  // 上央
    4: { top:"24%", left:"16%" },  // 左上
    5: { top:"68%", left:"16%" },  // 左下（=ヒーローの左隣）
  } as const;
  return map[slot];
}

/** HEROを下央に固定。右隣=直前ポジ、左隣=直後ポジ（ご要望③） */
function neighborsFrom(hero: Scenario["hero"]) {
  const i = ORDER.indexOf(hero);
  const prev1 = ORDER[(i - 1 + 6) % 6]; // 右下
  const prev2 = ORDER[(i - 2 + 6) % 6]; // 右上
  const prev3 = ORDER[(i - 3 + 6) % 6]; // 上央
  const next2 = ORDER[(i + 2) % 6];     // 左上
  const next1 = ORDER[(i + 1) % 6];     // 左下
  return [prev1, prev2, prev3, next2, next1] as const; // slots 1..5
}

function dealerOffset(slot: 1|2|3|4|5) {
  switch (slot) {
    case 1: return { transform: "translate(-44px, -6px)" };   // 右下 → 左へ & 少し上
    case 2: return { transform: "translate(-44px,  6px)" };   // 右上 → 左へ & 少し下
    case 3: return { transform: "translate(0, 24px)" };       // 上央 → 下へ
    case 4: return { transform: "translate(44px,   6px)" };   // 左上 → 右へ & 少し下
    case 5: return { transform: "translate(44px,  -6px)" };   // 左下 → 右へ & 少し上
  }
}

function chipOffset(slot: 1|2|3|4|5) {
  switch (slot) {
    case 1: return { transform: "translate(-36px, -2px)" };
    case 2: return { transform: "translate(-36px,  2px)" };
    case 3: return { transform: "translate(0,    18px)" };
    case 4: return { transform: "translate(36px,  2px)" };
    case 5: return { transform: "translate(36px, -2px)" };
  }
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
  const { question, nextQuestion, answer } = useStore();
  const studyFilter = useStore(s => s.studyFilter);
  const [feedback, setFeedback] = useState<null | { correct: boolean; allowed: Set<Action> }>(null);

  useEffect(() => {
    if (!question) nextQuestion(studyFilter ?? undefined);
  }, [question, nextQuestion, studyFilter]);

  if (!question) {
    return (
      <div className="body-bg">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <CardShell>問題を生成中…（初回は数秒かかることがあります）</CardShell>
        </main>
      </div>
    );
  }

  const { scenario, hand } = question;
  const opener = scenario.kind === "vs_open" ? scenario.opener : null;

  // タイトル
  const title = scenario.kind === "unopened"
    ? `${scenario.hero} / ${hand}`
    : `${scenario.hero} (Hero) vs ${scenario.opener} / ${hand}`;

  // アクション（2択時は中央寄せにする）
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
    setFeedback(res);
  }
  function next() {
    setFeedback(null);
    nextQuestion(studyFilter ?? undefined);
  }

  // 並び：HERO下央、1..5は（右下→右上→上→左上→左下）＝ご要望③
  const neighborList = neighborsFrom(scenario.hero);

  return (
    <div className="body-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>

        {/* 卓 */}
        <div className="relative mx-auto w-full max-w-3xl h-80 md:h-[28rem]">
          <div className="poker-table w-full h-full"></div>

          {/* slot0: HERO（下央） */}
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

          {/* slot1..5: 他席（BTNにDボタン、オープナー席はカード裏＋バッジ内チップ） */}
          {neighborList.map((pos, idx) => {
            const slot = (idx + 1) as 1|2|3|4|5;
            const c = slotCoords(slot);
            const isBTN = pos === "BTN";
            const isOpener = opener === pos;
            return (
              <div
                key={pos}
                className="absolute"
                style={{ top: c.top, left: c.left, transform: "translate(-50%, -50%)" }}
              >
                {/* ポジションの丸バッジ */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div className={`${seatClass[pos]} select-none`}>{pos}</div>
                </div>
            
                {/* チップ：席より“手前・中央側”に（重ならない＆z順で前） */}
                {isOpener && (
                  <div
                    className="pointer-events-none absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={chipOffset(slot)}
                  >
                    <ChipStack />
                  </div>
                )}
            
                {/* カード裏：席の少し上に（微重なりOK） */}
                {isOpener && (
                  <div className="pointer-events-none absolute z-20 left-1/2 -translate-x-1/2 -translate-y-[58px]">
                    <CardBackPair size="sm" />
                  </div>
                )}
            
                {/* Dealer（BTN）：席と重ならないよう中央寄りに */}
                {isBTN && (
                  <div
                    className="pointer-events-none absolute z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={dealerOffset(slot)}
                  >
                    <div className="dealer-chip">D</div>
                  </div>
                )}
              </div>
            );
            
          })}
        </div>

        {/* アクション（2択は中央寄せ） */}
        <CardShell>
          <div className={`action-row`}>
            {actions.map(b => (
              <Button key={b.action} onClick={() => pick(b.action)} className="min-w-[150px]">
                {b.label}
              </Button>
            ))}
          </div>

          {feedback && (
            <div className={`mt-4 p-3 rounded-xl border ${feedback.correct ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <p className="font-semibold">{feedback.correct ? "✅ 正解！" : "❌ 不正解"}</p>
              <p className="mt-1 text-sm text-zinc-700">許可アクション：{Array.from(feedback.allowed).join(" / ")}</p>
              <div className="mt-3">
                <Button variant="ghost" onClick={next}>次の問題へ</Button>
              </div>
            </div>
          )}
        </CardShell>
      </main>
    </div>
  );
}

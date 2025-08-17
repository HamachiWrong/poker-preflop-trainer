// app/src/pages/Play.tsx
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { Action } from "../lib/types";

export default function Play() {
  const { question, nextQuestion, answer } = useStore();
  const studyFilter = useStore((s) => s.studyFilter);
  const [feedback, setFeedback] = useState<null | { correct: boolean; allowed: Set<Action> }>(null);

  useEffect(() => {
    if (!question) nextQuestion(studyFilter ?? undefined);
  }, [question, nextQuestion, studyFilter]);

  if (!question) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <p>問題を生成中…（初回は数秒かかることがあります）</p>
      </div>
    );
  }

  const { scenario, hand } = question;

  // ①③ タイトル調整：RFIの (RFI) を除去。VsOpenは (Hero) を付与
  const title =
    scenario.kind === "unopened"
      ? `${scenario.hero} / ${hand}`
      : `${scenario.hero} (Hero) vs ${scenario.opener} / ${hand}`;

  // ② RFIのRaiseは 2.5BB 固定に
  const buttons =
    scenario.kind === "unopened"
      ? [
          { label: "Raise (2.5bb)", action: "raise" as const },
          { label: "Fold", action: "fold" as const },
        ]
      : [
          { label: "3bet (Raise)", action: "raise" as const },
          { label: "Call", action: "call" as const },
          { label: "Fold", action: "fold" as const },
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

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl bg-white shadow p-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {buttons.map((b) => (
            <button
              key={b.action}
              onClick={() => pick(b.action)}
              className="px-4 py-3 rounded-xl bg-zinc-900 text-white hover:opacity-90"
            >
              {b.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-100">
            <p className="font-medium">{feedback.correct ? "✅ 正解！" : "❌ 不正解"}</p>
            <p className="mt-1 text-sm text-zinc-600">許可アクション：{Array.from(feedback.allowed).join(" / ")}</p>
            <button onClick={next} className="mt-3 px-3 py-2 rounded-lg bg-white border">
              次の問題へ
            </button>
          </div>
        )}
      </div>

      {/* ④ 「レンジ読み込みへ戻る」リンクは削除 */}
    </div>
  );
}

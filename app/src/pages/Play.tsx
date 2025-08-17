import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { Action } from "../lib/types";

export default function Play() {
  const { question, nextQuestion, answer } = useStore();
  const studyFilter = useStore(s => s.studyFilter); // ← 追加
  const [feedback, setFeedback] = useState<null | {correct:boolean; allowed:Set<Action>}>(null);

  useEffect(() => {
    if (!question) nextQuestion(studyFilter ?? undefined); // ← 追加
  }, [question, nextQuestion, studyFilter]);               // ← 依存に追加

  if (!question) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <p>問題を生成中…（初回は数秒かかることがあります）</p>
        <a className="text-blue-600 underline" href="/">戻る</a>
      </div>
    );
  }  

  const { scenario, hand } = question;
  const title = scenario.kind === "unopened"
    ? `${scenario.hero} (RFI) / ${hand}`
    : `${scenario.hero} vs ${scenario.opener} / ${hand}`;

  const buttons =
    scenario.kind === "unopened"
      ? [{label:"Raise (3bb)", action:"raise" as const}, {label:"Fold", action:"fold" as const}]
      : [
          {label:"3bet (Raise)", action:"raise" as const},
          {label:"Call", action:"call" as const},
          {label:"Fold", action:"fold" as const},
        ];

  function pick(a: Action) {
    const res = answer(a);
    if (!res) return;
    setFeedback(res);
  }

  function next() {
    setFeedback(null);
    nextQuestion(studyFilter ?? undefined); // ← 追加
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl bg-white shadow p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {buttons.map(b => (
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
            <p className="font-medium">
              {feedback.correct ? "✅ 正解！" : "❌ 不正解"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              許可アクション：{Array.from(feedback.allowed).join(" / ")}
            </p>
            <button onClick={next} className="mt-3 px-3 py-2 rounded-lg bg-white border">
              次の問題へ
            </button>
          </div>
        )}
      </div>

      <div className="text-sm">
        <a className="text-blue-600 underline" href="/">レンジ読み込みへ戻る</a>
      </div>
    </div>
  );
}

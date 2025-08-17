import { create } from "zustand";
import { keyOf } from "../lib/types";
import type { AllowedMap, Action, Scenario, Hand169 } from "../lib/types";

type Question = { scenario: Scenario; hand: Hand169 };

type Store = {
  allowed: AllowedMap | null;
  setAllowed: (a: AllowedMap) => void;

  // 追加：学習フィルタ
  studyFilter: Partial<Scenario> | null;
  setStudyFilter: (f: Partial<Scenario> | null) => void;

  question: Question | null;
  nextQuestion: (filter?: Partial<Scenario>) => void;

  answer: (a: Action) => { correct: boolean; allowed: Set<Action> } | null;
};

export const useStore = create<Store>((set, get) => ({
  allowed: null,
  setAllowed: (a) => set({ allowed: a }),

  // 追加
  studyFilter: null,
  setStudyFilter: (f) => set({ studyFilter: f }),

  question: null,
  nextQuestion: (filter) => {
    const allowed = get().allowed;
    if (!allowed) return;

    // 渡された filter > 保存してある filter の順で適用
    const effFilter = filter ?? get().studyFilter ?? null;

    const keys = Object.keys(allowed).filter(k => {
      if (!effFilter) return true;
      const [kind, hero, opener] = k.split("|");
      if (effFilter.kind && effFilter.kind !== (kind as any)) return false;
      if (effFilter.hero && effFilter.hero !== (hero as any)) return false;
      if (typeof effFilter.opener !== "undefined" && effFilter.opener !== (opener as any)) return false;
      return true;
    });
    if (keys.length === 0) return;

    const key = keys[Math.floor(Math.random() * keys.length)];
    const [, hero, opener, hand] = key.split("|");
    const scenario = (opener ? { kind: "vs_open", hero, opener } : { kind: "unopened", hero, opener: "" }) as Scenario;
    set({ question: { scenario, hand: hand as Hand169 } });
  },

  answer: (a) => {
    const allowed = get().allowed;
    const q = get().question;
    if (!allowed || !q) return null;
    const key = keyOf(q.scenario, q.hand);
    const setActs = allowed[key] ?? new Set<Action>();
    const correct = setActs.has(a);
    return { correct, allowed: setActs };
  },
}));

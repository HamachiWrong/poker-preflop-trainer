import { create } from "zustand"; // ← これはランタイムで使う“値”なので必要
import { keyOf } from "../lib/types";                  // 値
import type { AllowedMap, Action, Scenario, Hand169 } from "../lib/types"; // 型

type Question = { scenario: Scenario; hand: Hand169 };

type Store = {
  allowed: AllowedMap | null;
  setAllowed: (a: AllowedMap) => void;

  question: Question | null;
  nextQuestion: (filter?: Partial<Scenario>) => void;

  answer: (a: Action) => { correct: boolean; allowed: Set<Action> } | null;
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const useStore = create<Store>((set, get) => ({
  allowed: null,
  setAllowed: (a) => set({ allowed: a }),

  question: null,
  nextQuestion: (filter) => {
    const allowed = get().allowed;
    if (!allowed) return;

    const keys = Object.keys(allowed).filter(k => {
      if (!filter) return true;
      const [kind, hero, opener] = k.split("|");
      if (filter.kind && filter.kind !== (kind as any)) return false;
      if (filter.hero && filter.hero !== (hero as any)) return false;
      if (typeof filter.opener !== "undefined" && filter.opener !== (opener as any)) return false;
      return true;
    });
    if (keys.length === 0) return;

    const key = randomPick(keys);
    const [, hero, opener, hand] = key.split("|");
    const scenario = (opener
      ? { kind: "vs_open", hero, opener }
      : { kind: "unopened", hero, opener: "" }) as Scenario;

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

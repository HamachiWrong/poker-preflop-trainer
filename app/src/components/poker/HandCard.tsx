type Suit = "H" | "D" | "C" | "S";
const SUIT_ICON: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

function Card({ rank, suit, className = "" }: { rank: string; suit: Suit; className?: string }) {
  const isRed = suit === "H" || suit === "D";
  return (
    <div className={`card-3d ${isRed ? "red" : "black"} relative ${className}`}>
      <div className="absolute top-1 left-1 text-lg font-extrabold leading-none">{rank}</div>
      <div className="absolute bottom-1 right-1 text-xl">{SUIT_ICON[suit]}</div>
    </div>
  );
}

function handToCards(hand: string): { r1: string; s1: Suit; r2: string; s2: Suit } {
  const r1 = hand[0]; const r2 = hand[1]; const tag = hand[2] ?? "";
  if (!r1 || !r2) return { r1: "?", s1: "S", r2: "?", s2: "H" };
  if (!tag) return { r1, s1: "H", r2, s2: "S" };
  if (tag === "s") return { r1, s1: "H", r2, s2: "H" };
  return { r1, s1: "H", r2, s2: "S" };
}

export default function HandCard({ hand }: { hand: string }) {
  const { r1, s1, r2, s2 } = handToCards(hand);
  return (
    <div className="flex items-center gap-2">
      <Card rank={r1} suit={s1} className="-rotate-3" />
      <Card rank={r2} suit={s2} className="rotate-3" />
    </div>
  );
}

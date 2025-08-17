export default function CardBackPair({ size = "sm" }: { size?: "sm" | "md" }) {
    const wh = size === "sm" ? "w-7 h-10" : "w-10 h-14";
    return (
      <div className="relative">
        <div className={`absolute -left-1 rotate-[-8deg] ${wh} rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-400 border border-zinc-500 shadow`} />
        <div className={`relative ${wh} rotate-[6deg] rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-400 border border-zinc-500 shadow`} />
      </div>
    );
  }
  
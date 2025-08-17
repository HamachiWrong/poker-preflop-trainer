export default function ChipStack({ tiny = true }: { tiny?: boolean }) {
    const s = tiny ? "w-3.5 h-3.5" : "w-5 h-5";
    return (
      <div className="relative h-4">
        <div className={`absolute left-0 ${s} rounded-full border border-white/70 shadow`} style={{background:"radial-gradient(circle at 40% 35%, #ff6b6b, #c63030)"}} />
        <div className={`absolute left-3 ${s} rounded-full border border-white/70 shadow`} style={{background:"radial-gradient(circle at 40% 35%, #4fe28a, #2e9a57)"}} />
        <div className={`absolute left-6 ${s} rounded-full border border-white/70 shadow`} style={{background:"radial-gradient(circle at 40% 35%, #6db1ff, #3369c9)"}} />
      </div>
    );
  }
  
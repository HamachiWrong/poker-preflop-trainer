import { useEffect, useState } from "react";
import { parseExcelArrayBuffer } from "../lib/parseRanges";
import { useStore } from "../state/store";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function UploadRanges() {
  const [mode, setMode] = useState<'rfi'|'vs_open'>('rfi');
  const allowed = useStore(s => s.allowed);
  const setAllowed = useStore(s => s.setAllowed);
  const setStudyFilter = useStore(s => s.setStudyFilter);
  const nextQuestion = useStore(s => s.nextQuestion);
  const nav = useNavigate();

  async function ensureDefaultLoaded() {
    if (allowed) return; // 既に読み込み済み
    const res = await fetch('/poker-preflop-trainer/Preflop_Ranges_Default.xlsx');
    if (!res.ok) throw new Error('default fetch failed');
    const buf = await res.arrayBuffer();
    const parsed = await parseExcelArrayBuffer(buf);
    setAllowed(parsed);
  }

  async function start() {
    try {
      await ensureDefaultLoaded();
      const filter = mode === 'rfi' ? { kind: 'unopened' as const } : { kind: 'vs_open' as const };
      setStudyFilter(filter);
      // 即時にそのモードで1問引いてから /play へ（Play側でも上書きするので二重でも安全）
      nextQuestion(filter);
      nav('/play');
    } catch (e) {
      alert('デフォルトデータの読み込みに失敗しました。通信環境をご確認ください。');
      console.error(e);
    }
  }

  useEffect(() => {
    // 表示時に静かにプリロード（失敗は無視）
    ensureDefaultLoaded().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="body-bg">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        {/* Hero */}
        <section className="relative grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Poker Preflop Trainer
            </h1>
            <p className="mt-4 text-zinc-700 leading-relaxed">
              プリフロップに特化した最短学習。強い基礎が、勝率を変える。
            </p>
            
          </div>

          {/* Animated preview */}
          <div className="relative h-64 md:h-72">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-emerald-200/50 to-emerald-500/30 blur-2xl"></div>
            <div className="absolute inset-0 rounded-[28px] bg-white/60 backdrop-blur border border-white/70 shadow-[0_20px_40px_rgba(0,0,0,.15)]"></div>

            {/* table preview */}
            <div className="absolute inset-4 rounded-[26px] overflow-hidden">
              <div className="poker-table w-full h-full"></div>
            </div>

            {/* floating elements */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* two hand cards */}
              <div className="relative w-[160px] h-[120px]">
                <div className="card-3d black absolute left-8 top-6 rotate-[-14deg] anim-float"></div>
                <div className="card-3d red absolute left-20 top-10 rotate-[12deg] anim-float-delay"></div>
                {/* chip */}
                <div className="chip chip-orange absolute -right-2 -bottom-1 anim-float-sm"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="mt-10">
          <Card className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-zinc-700">学習モード</label>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mode" value="rfi" checked={mode==='rfi'} onChange={() => setMode('rfi')} />
                  <span>RFI（未オープン）</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mode" value="vs_open" checked={mode==='vs_open'} onChange={() => setMode('vs_open')} />
                  <span>VsOpen（対オープン）</span>
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={start}>プレイ開始</Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

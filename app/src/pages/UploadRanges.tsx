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
      <main className="max-w-xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-3xl font-extrabold">Poker Preflop Trainer</h1>
        <Card className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-zinc-700">学習モード</label>
            <div className="flex gap-3">
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
      </main>
    </div>
  );
}

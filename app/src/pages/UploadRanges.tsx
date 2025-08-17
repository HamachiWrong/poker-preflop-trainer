import { useEffect, useState } from "react";
import { parseExcelArrayBuffer } from "../lib/parseRanges";
import { useStore } from "../state/store";
import { useNavigate } from "react-router-dom";

export default function UploadRanges() {
  const [mode, setMode] = useState<'rfi'|'vs_open'>('rfi');
  const allowed = useStore(s => s.allowed);
  const setAllowed = useStore(s => s.setAllowed);
  const setStudyFilter = useStore(s => s.setStudyFilter);
  const nav = useNavigate();

  async function ensureDefaultLoaded() {
    if (allowed) return;
    const url = `${import.meta.env.BASE_URL}Preflop_Ranges_Default.xlsx`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const a = await parseExcelArrayBuffer(buf);
    setAllowed(a);
  }

  useEffect(() => {
    // 初回にバックグラウンドでデフォルト読込（UIには表示しない）
    ensureDefaultLoaded().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      await ensureDefaultLoaded(); // まだならここで確実に読み込み
      setStudyFilter(mode === 'rfi' ? { kind: 'unopened' } : { kind: 'vs_open' });
      nav("/play");
    } catch (e) {
      alert("デフォルトデータの読み込みに失敗しました。通信環境を確認してください。");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Poker Preflop Trainer</h1>

      <div className="p-4 rounded-2xl bg-white shadow space-y-4">
        <div>
          <label className="block text-sm mb-1">学習モード</label>
          <div className="flex gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="rfi"
                checked={mode === 'rfi'}
                onChange={() => setMode('rfi')}
              />
              <span>RFI（未オープン）</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="vs_open"
                checked={mode === 'vs_open'}
                onChange={() => setMode('vs_open')}
              />
              <span>VsOpen（対オープン）</span>
            </label>
          </div>
        </div>

        <button
          className="px-4 py-2 rounded-lg bg-black text-white"
          onClick={start}
        >
          プレイ開始
        </button>
      </div>
    </div>
  );
}

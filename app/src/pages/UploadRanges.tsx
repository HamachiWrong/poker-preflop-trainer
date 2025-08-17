import { useState } from "react";
import { parseExcelArrayBuffer } from "../lib/parseRanges";
import { useStore } from "../state/store";
import { useNavigate } from "react-router-dom";

export default function UploadRanges() {
  const [status, setStatus] = useState<string>("Excel（Preflop_Ranges_Final.xlsx）を選択してください");
  const setAllowed = useStore(s => s.setAllowed);
  const nav = useNavigate();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("解析中…");
    const buf = await file.arrayBuffer();
    const allowed = await parseExcelArrayBuffer(buf);
    setAllowed(allowed);
    setStatus(`OK: 読み込み成功（定義 ${Object.keys(allowed).length} 件）`);
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Poker Preflop Trainer</h1>
      <div className="p-4 rounded-2xl bg-white shadow">
        <p className="mb-3 text-sm text-zinc-600">{status}</p>
        <input type="file" accept=".xlsx" onChange={onFile} className="block w-full" />
        <button
          className="mt-4 px-4 py-2 rounded-lg bg-black text-white disabled:opacity-40"
          onClick={() => nav("/play")}
        >
          プレイ開始
        </button>
        <p className="mt-3 text-xs text-zinc-500">
          * 判定はセル文字列の集合（R/C/F）。RFIはR/Fのみ、VsOpenはR/C/F。AA/KKのFは無効化。
        </p>
      </div>
    </div>
  );
}

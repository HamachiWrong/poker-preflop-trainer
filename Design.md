# Poker Preflop Trainer — 設計（Design.md）

## 1. アーキテクチャ
- クライアントのみの SPA（React + TypeScript + Vite + Tailwind）。
- 状態管理：Zustand。Excel読込：SheetJS（xlsx）。
- テスト：Vitest + React Testing Library、E2E：Playwright。
- 任意：PWA（Service Worker）でオフライン再生。

## 2. 主要モジュール
```
src/
  lib/
    parseRanges.ts       # Excel→AllowedMap 生成
    validateRanges.ts    # データ検証＆警告
    hand.ts              # 169キー生成/解析（AKs/AQo/TT）
    scenario.ts          # シナリオの型/生成
  state/
    store.ts             # Zustand ストア（allowedMap, stats, settings）
  components/
    UploadRanges.tsx     # Excel アップロードUI
    Play.tsx             # 出題/回答/判定
    RangePopup.tsx       # 169表表示（SVG）
    Stats.tsx            # 学習統計
    Settings.tsx         # 設定
```

## 3. 型定義（TypeScript）
```ts
export type Pos = 'UTG'|'HJ'|'CO'|'BTN'|'SB'|'BB';
export type Action = 'raise'|'call'|'fold';

export type Scenario =
  | { kind: 'unopened'; hero: Exclude<Pos,'BB'>; opener: '' }
  | { kind: 'vs_open'; hero: Exclude<Pos,'UTG'>; opener: Exclude<Pos,'BB'> };

export type Hand169 = string; // 'AKs' | 'AQo' | 'TT' ...
export type AllowedMap = { [key: string]: Set<Action> };

export type UserStats = { attempts: number; correct: number; lastSeenAt: number };
export type StatsMap = { [key: string]: UserStats };
```

### AllowedMap のキー
```
key = `${kind}|${hero}|${opener}|${hand}`
例： "vs_open|HJ|UTG|AKo" → Set{'raise','call'}
     "unopened|CO||A5s"   → Set{'raise'}
```

## 4. Excel 解析
- **RFI** と **VsOpen** から 14×14 ブロック（ヘッダ含む）を検出。
  - 1行目/1列目が `A K Q J T 9 8 7 6 5 4 3 2` であることを確認。
  - 複数ブロック（見出し→表→空行）を**順番に抽出**。
- セル解釈：`cell.split('/')` → `R|C|F` を `raise|call|fold` に写像。空白や小文字はトリム・大文字化。
  - **RFI** では `C` を無視（存在しても採用しない）。
  - 非対応トークンは警告（`validateRanges.ts`）。

### hand キー生成（行i,列j → 'AKs'等）
- `i==j` → ペア（AA, KK, ...）
- `j>i` → **スート（AKs）** / `j<i` → **オフ（AKo）**
- 文字はランクを高い方から並べる（AK, KQ, ...）。

## 5. 出題ロジック
```ts
function nextQuestion(allowed: AllowedMap, stats: StatsMap, mode:'uniform'|'weighted') {
  // 1) ユーザー設定に基づき対象シナリオ集合を作る
  // 2) weighted: 弱点（正答率低/直近誤答/長く未出題）に重み
  // 3) ランダム抽選で {scenario, hand} を返す
}
```

## 6. 判定
```ts
function isCorrect(allowed: AllowedMap, q: {scenario:Scenario, hand:Hand169}, pick: Action): boolean {
  const key = `${q.scenario.kind}|${q.scenario.hero}|${q.scenario.opener}|${q.hand}`;
  return allowed[key]?.has(pick) ?? false;
}
```

## 7. レンジ表表示（RangePopup）
- **SVG**で13×13生成（ヘッダ付き）。
- 色レイヤ：R=赤 / C=緑 / F=青（混合は複合表現でも、まずはテキスト重ねでOK）。
- 現在セルを枠線でハイライト。ズーム/スクロールは不要（全体表示）。

## 8. エラーハンドリング
- ブロック検出不可・不正トークン・空セル：`validateRanges.ts` が検出し、UIで警告（一覧表示）。
- 解析失敗セルは **出題対象から除外**（デフォルト）。

## 9. 永続化
- `localStorage` に `StatsMap` とユーザー設定を保存。リセット機能あり。

## 10. パフォーマンス & A11y
- 初回ロード < 2.5s（4G）。SVG再描画は必要最小限に。タップ領域 44px 以上。
- キーボード：`R`/`C`/`F` をショートカットに割当（モバイルは無視）。
- コントラスト比 4.5:1 以上。フォーカスリングを明示。

## 11. テスト方針
- Unit：セルパース、AllowedMap構築、handキー生成、判定、重み計算。
- Integration：Excel→AllowedMap→判定まで一気通し。
- E2E：アップロード→出題→回答→ポップアップ確認→記録保存。
- 代表ケース：AKo=R/C、A3s=R/F、**KK に F を含めない**（サニティ）。

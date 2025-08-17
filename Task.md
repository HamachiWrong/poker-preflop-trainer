# Poker Preflop Trainer — タスク計画（Task.md）

## マイルストーン
### M1: 骨組み
- [ ] Vite + React + TypeScript + Tailwind セットアップ
- [ ] ルーティング（/upload, /play, /settings, /stats）
- [ ] 型とユーティリティ（hand/scenarioの定義）

### M2: データ読み込み
- [ ] SheetJSでExcelを読み込み（ローカルファイル選択）
- [ ] RFI/VsOpen の 14×14 ブロック検出
- [ ] セル文字列を `/` 分割→`R|C|F` → `raise|call|fold` に写像
- [ ] AllowedMap 構築 & バリデーション（不正/空セルの警告一覧）
- [ ] サンプルExcelで通し確認

### M3: ゲームロジック
- [ ] 問題生成（uniform）
- [ ] 回答UI（RFI=2択、VsOpen=3択）
- [ ] 判定/スコア表示/連続正解
- [ ] 不正解時のレンジポップアップ（SVGの169表＋セルハイライト）

### M4: UI/UX
- [ ] モバイル最適化（タップ44px+、片手操作）
- [ ] テーマ/音/ショートカット
- [ ] 成績（シナリオ×ハンドの正答率ヒートマップ）

### M5: 学習強化
- [ ] StatsMap（ローカル保存）
- [ ] weighted出題（弱点優先）
- [ ] 設定画面から範囲/モード/重み付けを制御

### M6: 品質
- [ ] Unit/Integration/E2E テスト整備
- [ ] CI（lint+typecheck+tests）
- [ ] パフォーマンス測定（初回ロード/描画16ms）・A11yチェック

## 追加チケット例
- feat(data): `parseRanges.ts` 実装（I/O・バリデーション連携）
- feat(data): `validateRanges.ts` 実装（警告モデル・UI）
- feat(game): 出題ロジック（uniform/weighted）
- feat(ui): `RangePopup` SVG 実装
- feat(stats): 正答率集計とヒートマップ
- chore(dev): ディレクトリ構成/エイリアス設定/Vitest導入
- test(e2e): アップロード→出題→判定→ポップアップ

## 受け入れ基準（DoD）
- Excelをアップロードすれば**即プレイ可能**（手作業は不要）
- 代表例が通る：
  - AKo=R/C（Foldは不正解）
  - A3s=R/F（Callは不正解）
  - KK：Fold は**常に不正解**
- 不正・空セルは警告に出て、デフォルト出題から除外
- スマホでストレスなく操作できる（タップ領域/レイアウト/遅延）
- CIで lint + typecheck + tests が通る

## 参考ディレクトリ構成
```
/src
  /components
  /lib
  /state
  /styles
/tests
  /unit
  /integration
  /e2e
/docs
public/
index.html
```

## リスク/対応
- Excel体裁のブレ → ブロック検出を寛容に、検出失敗時はサンプルで起動＋警告
- モバイル描画の重さ → SVGで最小DOM、再描画を最小化
- データ誤り → validateで早期検知、セル位置と内容をログ表示

# コントリビューションガイド

## 開発環境

```bash
nvm use            # .nvmrc（Node 22）
npm ci
npm run dev        # http://localhost:3000
```

Firebase の環境変数が無くても、デモモード（localStorage）で全画面が動作します。

## ブランチとコミット

- `main` は常にデプロイ可能な状態に保つ
- 作業は `feat/…` `fix/…` `chore/…` `docs/…` のブランチで行う
- コミットメッセージは日本語可。1コミット1目的を心がける
- 変更は Pull Request 経由で `main` へ

## Pull Request の条件

以下がすべて通っていること（CI でも検証されます）。

```bash
npm run lint
npm run build
npm run typecheck
```

UI を変更した場合は、スマホ幅（390px）のスクリーンショットを添付してください。

## コーディング方針

- TypeScript の `strict` を維持する。`any` は原則使わない
- ドメイン型は `src/lib/types.ts` に集約する
- Firestore / Storage へのアクセスは `src/lib/backend-*.ts` に閉じ込め、
  画面から直接 SDK を呼ばない（デモモードとの互換を保つため）
- 例外は握りつぶさず、利用者向け表示には `src/lib/errors.ts` の `toUserMessage()` を通す
- 位置情報・距離計算は `src/lib/geo.ts` に集約する（判定半径はここで一元管理）

## 神社データの変更

- データ本体は `scripts/gen-shrines.mjs` が生成元（`src/data/shrines.ts` と `firestore/shrines.json`）
- 神社を追加・修正する場合は **スクリプトを直して再生成** する（生成物を直接編集しない）
- 緯度経度は境内の代表点を入れる。出典（公式サイト等）を Pull Request に記載すること

## セキュリティ

脆弱性の報告は Issue ではなく `SECURITY.md` の手順でお願いします。
サービスアカウント鍵（`serviceAccountKey.json`）や `.env.local` は絶対にコミットしないでください。

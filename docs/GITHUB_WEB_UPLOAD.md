# GitHub Web Upload だけで公開する手順

GitHub の Web UI（ドラッグ＆ドロップ）は **1回のアップロードで100ファイルまで**、
**1フォルダあたり100ファイル未満** に収める必要があります。
本リポジトリはその制限に収まるよう整理済みです（最大フォルダでも19ファイル）。

## 1. フォルダ別ファイル数（アップロード前の確認）

`node_modules` / `.next` / `.git` を除いた数です。

| フォルダ | ファイル数 | 内容 |
| --- | ---: | --- |
| （ルート） | 19 | package.json、next.config.ts、README、LICENSE、vercel.json 等 |
| `src/lib/` | 12 | 型・Firebase連携・エラー処理・位置情報 |
| `docs/screenshots/` | 8 | 画面キャプチャ（README用） |
| `src/components/` | 7 | UI部品 |
| `src/app/` | 6 | layout / globals.css / page / error / global-error / not-found |
| `public/images/` | 6 | 神社カード用の共通画像（WebP） |
| `public/` | 4 | manifest.webmanifest / sw.js / offline.html / favicon.ico |
| `public/icons/` | 4 | PWAアイコン（192 / 512 / maskable / apple-touch） |
| `scripts/` | 3 | データ生成・Firestore投入・画面キャプチャ |
| `docs/` | 2 | DEPLOY.md / RELEASE_CHECKLIST.md |
| `public/sample/` | 2 | デモ用の御朱印サンプル |
| `src/data/` | 2 | **shrines.json（神社100件）** / shrines.ts（読み込み） |
| `src/app/*/`（各画面） | 1 | 各ルートの page.tsx |
| `firestore/`, `.github/*` | 1〜2 | ルール・CI・テンプレート |
| **合計** | **86** | — |

> 神社データは `src/data/shrines.json` の1ファイルに集約しています。
> 神社ごとの画像ファイル（旧 `public/shrines/*.svg` 100枚）は廃止し、
> `public/images/shrine-1.webp` 〜 `shrine-6.webp` の6枚を割り当てる方式に変更しました。

## 2. アップロード手順（Web UI のみ）

1. GitHub で **New repository** を作成（README は追加しない＝空のまま）
2. リポジトリの **Add file → Upload files** を開く
3. **フォルダ単位でドラッグ＆ドロップ** する（1回100ファイル未満なので、まとめてでも可）
   - ルートのファイル（`package.json` など）＋ `src` `public` `scripts` `docs` `firestore` `.github`
   - `.github` は隠しフォルダのため、エクスプローラー／Finder で表示設定を ON にする
4. コミットメッセージを入れて **Commit changes**
5. `src/app/shrines/[id]` のように **角括弧を含むフォルダ** は、Web UI のドラッグ＆ドロップで
   正しく作成されない場合があります。その場合は **Add file → Create new file** で
   パスに `src/app/shrines/[id]/page.tsx` を直接入力して作成してください。

> **`.env.local` はアップロードしないでください。** 環境変数は Vercel 側で設定します。

## 3. アップロード後の確認

GitHub 上で次を確認します。

- [ ] `src/data/shrines.json` が1ファイルで存在する
- [ ] `public/` に `manifest.webmanifest` `sw.js` `offline.html` がある
- [ ] `public/icons/` に4ファイルある
- [ ] `public/shrines/`（旧・神社画像100枚）が存在しない
- [ ] `src/app/shrines/[id]/page.tsx` が存在する

## 4. Vercel へ接続

1. <https://vercel.com/new> でリポジトリを Import
2. Framework Preset：**Next.js**（自動検出）／ Root Directory：リポジトリ直下
3. Environment Variables に `NEXT_PUBLIC_FIREBASE_*`（6項目）と
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`（任意）、`NEXT_PUBLIC_ENABLE_DEMO_TOOLS=false` を登録
4. Deploy

`vercel.json` で `regions: ["hnd1"]`（東京）と、`sw.js` の no-cache、
`/images/*` の長期キャッシュを設定済みです。

## 5. どうしても Web UI だけで完結させたい場合の注意

- 1ファイル 25MB まで（本リポジトリの最大は `package-lock.json` の約 0.3MB）
- 空フォルダは作成できないため、必ずファイルを含むフォルダのみアップロードする
- 削除は GitHub 上でファイルを開き **Delete file**（フォルダごと削除する場合は複数選択）

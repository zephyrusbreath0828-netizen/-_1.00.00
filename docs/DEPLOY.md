# デプロイ手順書 — 神旅帳 MVP

対象読者：開発者・運用担当
所要時間：初回 40〜60分

---

## 0. 前提

| 項目 | 内容 |
| --- | --- |
| Node.js | 20 以上（推奨 22） |
| パッケージマネージャ | npm |
| 必要なアカウント | Google（Firebase コンソール / Google Cloud コンソール） |

```bash
git clone <このリポジトリ>
cd kamitabicho
npm install
```

---

## 1. 動作確認（Firebase なし・デモモード）

```bash
npm run dev
# → http://localhost:3000
```

ログイン画面で「デモモードで試す」を押すと、登録不要で全画面を確認できます。
データはブラウザの `localStorage` にのみ保存されます。

---

## 2. Firebase プロジェクトの作成

1. <https://console.firebase.google.com/> で「プロジェクトを追加」
2. 作成後、**Authentication → Sign-in method → Google** を有効化
3. **Firestore Database → データベースを作成**
   - ロケーション：`asia-northeast1`（東京）を推奨
   - モード：本番環境モード
4. **Storage → 始める**
   - ロケーション：同上
5. **プロジェクトの設定 → 全般 → マイアプリ → ウェブアプリを追加** で `firebaseConfig` を取得

---

## 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # 任意（未設定なら簡易地図）
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

> `NEXT_PUBLIC_` 付きの値はブラウザに公開されます。サービスアカウント鍵などの秘密情報は**絶対に**ここへ書かないでください。

---

## 4. セキュリティルールとインデックスの適用

リポジトリ同梱のルール／インデックスをそのままデプロイできます。

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # 作成したプロジェクトを選択

firebase deploy --only firestore:rules,firestore:indexes,storage
```

手動で設定する場合は、コンソールのルールエディタに以下を貼り付けます。

- Firestore：`firestore.rules`
- Storage：`storage.rules`
- 複合インデックス：`firestore.indexes.json`
  - `visit_history`：`user_id` 昇順 + `visited_at` 降順
  - `goshuin`：`user_id` 昇順 + `created_at` 降順

> インデックス作成完了まで数十秒かかります。未完了の間は一覧が
> 「インデックス作成中」エラーになることがありますが、本アプリは自動的に
> クライアント側ソートへフォールバックします。

---

## 5. 神社マスタ（100件）の投入

> 神社データは `src/data/shrines.json`（単一ファイル）に集約されています。
> 旧 `public/shrines/*.svg`（100枚）は廃止し、`public/images/shrine-1〜6.webp` を共通利用します。

1. **プロジェクトの設定 → サービスアカウント → 新しい秘密鍵の生成** で `serviceAccountKey.json` を保存（プロジェクト直下に置く）
2. 実行：

```bash
npm run seed
# または鍵のパスを指定: node scripts/seed-shrines.mjs ./serviceAccountKey.json
```

`shrines` コレクションに100件が作成されます（再実行しても上書き更新）。
`image_url` は `/images/shrine-N.webp` を指すため、Vercel 上でもそのまま表示されます。

> 未投入の状態でもアプリは同梱データで動作しますが、訪問数（`visit_count`）の
> 加算は Firestore 側にのみ反映されるため、必ず投入してください。

---

## 6. Google Maps API キーの設定（任意）

1. <https://console.cloud.google.com/> → **APIとサービス → ライブラリ → Maps JavaScript API** を有効化
2. **認証情報 → APIキーを作成**
3. キーの制限：
   - アプリケーションの制限：**ウェブサイト**
   - 許可するリファラー：`https://your-domain.example/*`、`http://localhost:3000/*`
   - APIの制限：**Maps JavaScript API** のみ
4. `.env.local` の `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` に設定

未設定の場合は OpenStreetMap の簡易地図が表示され、機能は損なわれません。

---

## 7. Authentication の承認済みドメイン

**Authentication → Settings → 承認済みドメイン** に本番ドメインを追加します。

```
localhost
your-project.firebaseapp.com
your-project.web.app
your-domain.example        ← 本番独自ドメイン
```

追加を忘れると Google ログインが `auth/unauthorized-domain` で失敗します。

---

## 8. デプロイ

### 8-1. Firebase Hosting（推奨）

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` に `frameworksBackend`（`asia-northeast1`）を設定済みのため、
Next.js の SSR もそのまま動作します。

### 8-2. Vercel

1. リポジトリを Vercel にインポート
2. **Environment Variables** に `.env.local` と同じ値を登録
3. Framework Preset：Next.js（ビルド設定は自動検出）
4. デプロイ後、表示されたドメインを Firebase の**承認済みドメイン**に追加（手順 7）

### 8-3. その他（Cloud Run / 自前サーバー）

```bash
npm run build
npm start          # 0.0.0.0:3000 で待ち受け
```

リバースプロキシ経由で HTTPS を終端してください。PWA の Service Worker と
位置情報 API は **HTTPS が必須**です（`localhost` のみ例外）。

---

## 9. リリース前チェックリスト

- [ ] `npm run build` がエラーなく完了する
- [ ] `firebase deploy --only firestore:rules,indexes,storage` 済み
- [ ] 神社マスタ100件を投入済み
- [ ] 承認済みドメインに本番ドメインを追加済み
- [ ] Google ログインでログインできる（別アカウントでも確認）
- [ ] スマホ実機で現在地が取得できる（HTTPS）
- [ ] 神社の300m以内でチェックインでき、300m超では登録できない
- [ ] 御朱印写真が Storage の `goshuin/{uid}/` に保存される
- [ ] ホーム画面に追加（PWA）して起動できる
- [ ] オフライン時に `/offline.html` が表示される
- [ ] `firestore.rules` の `distance_m <= 300` 制約が有効（不正登録の抑止）
- [ ] 本番ドメインで Lighthouse の PWA 項目を確認

---

## 10. 運用メモ

| 作業 | コマンド |
| --- | --- |
| 開発サーバー | `npm run dev` |
| 型チェックのみ | `npm run typecheck` |
| 本番ビルド | `npm run build` |
| 神社データ再生成 | `node scripts/gen-shrines.mjs` |
| 神社データ投入 | `npm run seed` |
| ルールのみ再デプロイ | `firebase deploy --only firestore:rules,storage` |

### コスト目安

想定ユーザー1,000人・1人あたり参拝10件・御朱印5枚の場合、
Firestore の読み書きは無料枠（1日 50,000 read / 20,000 write）内に収まる見込みです。
写真は1枚 約300KB × 5,000枚 = 約1.5GB（Storage 無料枠は 5GB）。
詳細は Firebase の料金ページで確認してください。

### 障害時の切り分け

| 症状 | 確認箇所 |
| --- | --- |
| ログインできない | 承認済みドメイン / Google プロバイダ有効化 |
| 一覧が「インデックス作成中」で失敗 | `firestore.indexes.json` の適用状況 |
| 神社が0件 | `npm run seed` 未実行（同梱データで代替表示中） |
| 写真アップロードが失敗 | `storage.rules` / Storage の有効化 / 8MB制限 |
| 位置情報が取れない | HTTPS かどうか / 端末の位置情報権限 |

---

## 11. Vercel へのデプロイ（詳細）

### 11-1. リポジトリの準備

```bash
git init -b main
git add .
git commit -m "feat: 神旅帳 MVP 初版"
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```

`firebase.json` は Firebase Hosting 用の設定です。Vercel は無視するため、
削除せずに残しておいて構いません（両方にデプロイ可能）。

### 11-2. Vercel プロジェクトの作成

1. <https://vercel.com/new> でリポジトリを Import
2. Framework Preset は **Next.js**（自動検出）
3. Root Directory：リポジトリ直下（`kamitabicho/` を切り出した場合はそれを指定）
4. Node.js Version：**22.x**（`.nvmrc` があるため自動で適用されます）
5. Build Command / Output：既定のまま（`npm run build`）

### 11-3. 環境変数（Production / Preview 双方に登録）

Vercel の Settings → Environment Variables に `.env.local` と同じ値を登録します。

| Key | 値 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` ほか `NEXT_PUBLIC_FIREBASE_*`（6項目） | Firebase コンソールの値 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JavaScript API キー（任意） |
| `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` または独自ドメイン |
| `NEXT_PUBLIC_ENABLE_DEMO_TOOLS` | `false`（本番では検証用ツールを隠す） |

### 11-4. 独自ドメインと Firebase 側の設定

1. Vercel の Domains で任意ドメインを追加し、指定の CNAME / A レコードを設定
2. **Firebase Authentication → Settings → 承認済みドメイン** に追加
   - `<project>.vercel.app`
   - `*.vercel.app` は使えないため、**プレビュー確認用に個別ドメインを追加**するか、
     プレビューでは Google ログインを使わない運用にする
   - 独自ドメイン（例：`kamitabicho.example`）
3. Google Cloud Console の API キー制限に Vercel のドメインを追加
   - 許可するリファラー：`https://<project>.vercel.app/*`、`https://kamitabicho.example/*`

### 11-5. デプロイ後の確認

- [ ] ログインできる（`auth/unauthorized-domain` が出ない）
- [ ] 位置情報の許可ダイアログが出る（HTTPS 必須）
- [ ] 御朱印写真が Storage に保存される
- [ ] ブラウザで「ホーム画面に追加」できる
- [ ] `https://<domain>/sw.js` が 200 で返る（`Cache-Control: no-cache`）

### 11-6. 継続的デプロイ

`main` への push で本番、Pull Request でプレビューが自動作成されます。
CI は GitHub Actions（`.github/workflows/ci.yml`）で lint / build / typecheck を実行します。

---

## 12. GitHub 公開準備

公開前に以下を確認してください。

```bash
# 1) 秘密情報がコミットされていないか
git grep -nE "(BEGIN PRIVATE KEY|serviceAccountKey|AIza[0-9A-Za-z_-]{20,})" $(git rev-list --all) 2>/dev/null | head
# 2) 追跡対象の確認
git status --short
```

| 項目 | 対応 |
| --- | --- |
| ライセンス | `LICENSE`（MIT）。組織名義に変更する場合は編集する |
| README | スクリーンショット・環境変数表・デプロイ手順へのリンクを記載済み |
| CI | `.github/workflows/ci.yml`（lint / build / typecheck） |
| Issue / PR テンプレート | `.github/ISSUE_TEMPLATE/`、`.github/PULL_REQUEST_TEMPLATE.md` |
| コントリビューション | `CONTRIBUTING.md` |
| セキュリティ | `SECURITY.md`（既知の前提＝App Check 未導入などを明記） |
| 除外設定 | `.gitignore` で `.env*`・サービスアカウント鍵・`node_modules`・`.next` を除外 |

### 12-1. 機密について

- `serviceAccountKey.json` と `.env.local` は**絶対にコミットしない**（`.gitignore` 済み）
- 誤ってコミットした場合は、Firebase コンソールで鍵を**失効**させ、鍵を再発行し、
  `git filter-repo` で履歴から除去してください（履歴からの削除だけでは漏洩は止まりません）
- Google Maps API キーはリファラー制限を必ず設定（公開リポジトリのキーは誰でも使えるため）

### 12-2. 推奨ブランチ保護

- `main`：Require pull request + Require status checks（CI の `verify`）+ Linear history

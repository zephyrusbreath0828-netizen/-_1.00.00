/**
 * Firestore へ神社マスタ（100件）を投入するスクリプト
 *
 * 事前準備:
 *   1. Firebase コンソール > プロジェクトの設定 > サービスアカウント で
 *      「新しい秘密鍵の生成」を行い serviceAccountKey.json を保存
 *   2. .env で GOOGLE_APPLICATION_CREDENTIALS をそのパスに設定（または引数で渡す）
 *   3. npm run seed
 *
 * 使い方: node scripts/seed-shrines.mjs [serviceAccountKey.json のパス]
 */
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json";

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error(`サービスアカウント鍵を読み込めませんでした: ${keyPath}`);
  console.error("Firebase コンソールで秘密鍵を生成し、パスを引数または環境変数で指定してください。");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
}

const db = getFirestore();
const shrines = JSON.parse(readFileSync("src/data/shrines.json", "utf8"));

let written = 0;
for (let i = 0; i < shrines.length; i += 400) {
  const chunk = shrines.slice(i, i + 400);
  const batch = db.batch();
  for (const s of chunk) {
    batch.set(db.collection("shrines").doc(s.id), s, { merge: true });
    written += 1;
  }
  await batch.commit();
  console.log(`  ... ${written} / ${shrines.length} 件を書き込み`);
}

console.log(`完了: shrines コレクションに ${written} 件を投入しました。`);
process.exit(0);

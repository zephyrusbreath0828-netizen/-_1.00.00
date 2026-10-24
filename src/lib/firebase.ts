/**
 * Firebase 初期化（クライアント SDK v12 / modular）
 *
 * 環境変数 NEXT_PUBLIC_FIREBASE_* が揃っているときだけ初期化する。
 * 未設定の場合は isFirebaseConfigured === false となり、
 * アプリは自動的にデモモード（localStorage）へフォールバックする。
 *
 * 使用サービス:
 *   - Firebase Authentication（Google ログイン）
 *   - Cloud Firestore（users / shrines / visit_history / goshuin）
 *   - Firebase Storage（御朱印写真・プロフィール画像）
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** 必須3項目が揃っていれば Firebase モードで動作する */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase が未設定です。.env.local に NEXT_PUBLIC_FIREBASE_* を設定してください。",
    );
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFbAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export function getFbStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(getFirebaseApp());
  return storage;
}

/** Firestore コレクション名（4コレクション固定） */
export const COLLECTIONS = {
  users: "users",
  shrines: "shrines",
  visitHistory: "visit_history",
  goshuin: "goshuin",
} as const;

/** Storage の保存パス */
export const STORAGE_PATHS = {
  goshuin: (uid: string, fileName: string) => `goshuin/${uid}/${fileName}`,
  avatar: (uid: string, fileName: string) => `avatars/${uid}/${fileName}`,
} as const;

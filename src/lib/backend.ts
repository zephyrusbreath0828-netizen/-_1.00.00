/**
 * バックエンドの選択
 *
 * - NEXT_PUBLIC_FIREBASE_* が揃っていれば FirebaseBackend
 * - 未設定なら DemoBackend（localStorage）
 * - URL に ?demo=1 を付けると Firebase 設定済みでもデモモードで起動（動作確認用）
 * - ?firebase=1 でデモ固定を解除
 */
import { DemoBackend } from "@/lib/backend-demo";
import { FirebaseBackend } from "@/lib/backend-firebase";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Backend } from "@/lib/types";

const FORCE_DEMO_KEY = "kamitabicho:force-demo";

let backend: Backend | null = null;

function resolveForceDemo(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") window.localStorage.setItem(FORCE_DEMO_KEY, "1");
  if (params.get("firebase") === "1") window.localStorage.removeItem(FORCE_DEMO_KEY);
  return window.localStorage.getItem(FORCE_DEMO_KEY) === "1";
}

export function getBackend(): Backend {
  if (backend) return backend;
  const forceDemo = resolveForceDemo();
  backend = isFirebaseConfigured && !forceDemo ? new FirebaseBackend() : new DemoBackend();
  return backend;
}

/** テスト・設定画面表示用 */
export function backendInfo() {
  return {
    configured: isFirebaseConfigured,
    using: getBackend().mode,
    description: getBackend().describe(),
  };
}

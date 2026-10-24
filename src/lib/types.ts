/**
 * 神旅帳 MVP ドメイン型定義
 *
 * Firestore コレクションは以下の4つのみ:
 *   users / shrines / visit_history / goshuin
 */

/** users/{uid} */
export type UserProfile = {
  uid: string;
  /** 表示名（ニックネーム） */
  nickname: string;
  /** Firebase Storage のダウンロードURL、または data URL（デモモード） */
  photo_url: string | null;
  /** true の場合、Firebase に接続していないローカルデモユーザー */
  is_demo?: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
};

/** shrines/{shrineId} */
export type Shrine = {
  id: string;
  name: string;
  prefecture: string;
  address: string;
  latitude: number;
  longitude: number;
  main_deity: string;
  description: string;
  /** 神社画像（MVP は同梱SVG。将来は Storage の画像URL） */
  image_url: string;
  /** 訪問記録数（Firestore では集計値、MVP はシード値 + デモ加算） */
  visit_count: number;
};

/** visit_history/{visitId} — GPS チェックインの記録 */
export type VisitHistory = {
  id: string;
  user_id: string;
  shrine_id: string;
  /** 一覧表示用の非正規化フィールド */
  shrine_name: string;
  shrine_prefecture: string;
  visited_at: string; // ISO 8601
  /** チェックイン時の端末位置 */
  latitude: number;
  longitude: number;
  /** 神社からの距離(m)。300m 以内のみ登録可能 */
  distance_m: number;
};

/** goshuin/{goshuinId} — 御朱印帳 */
export type Goshuin = {
  id: string;
  user_id: string;
  shrine_id: string;
  shrine_name: string;
  /** Firebase Storage のダウンロードURL、または data URL（デモモード） */
  photo_url: string;
  visited_date: string; // YYYY-MM-DD
  memo: string;
  created_at: string;
};

/** ログイン中のセッションユーザー */
export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo: boolean;
};

/** 新規訪問記録の入力 */
export type NewVisitInput = {
  user_id: string;
  shrine_id: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  visited_at?: string;
};

/** 新規御朱印の入力 */
export type NewGoshuinInput = {
  user_id: string;
  shrine_id: string;
  visited_date: string;
  memo: string;
  /** 選択された画像ファイル（Storage へアップロード） */
  file?: File | null;
  /** ファイルがない場合に使う既存画像URL */
  photo_url?: string;
};

/** バックエンド（Firebase / デモ）共通インターフェース */
export type BackendMode = "firebase" | "demo";

export interface Backend {
  mode: BackendMode;
  /** 直近の listShrines() が Firestore / 同梱データ のどちらから取得したか */
  shrineSource: "firestore" | "bundled";
  /** 起動時に呼び、モードの説明文を返す */
  describe(): string;
  onAuthChange(cb: (user: SessionUser | null) => void): () => void;
  signInWithGoogle(): Promise<SessionUser>;
  signInAsDemo(nickname?: string): Promise<SessionUser>;
  signOut(): Promise<void>;
  getUserProfile(uid: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  listShrines(): Promise<Shrine[]>;
  getShrine(id: string): Promise<Shrine | null>;
  addVisit(input: NewVisitInput): Promise<VisitHistory>;
  deleteVisit(visitId: string): Promise<void>;
  listVisits(uid: string): Promise<VisitHistory[]>;
  addGoshuin(input: NewGoshuinInput): Promise<Goshuin>;
  deleteGoshuin(goshuinId: string): Promise<void>;
  listGoshuin(uid: string): Promise<Goshuin[]>;
  /** 御朱印写真 / プロフィール画像のアップロード。戻り値は表示用URL */
  uploadImage(uid: string, kind: "goshuin" | "avatar", file: File): Promise<string>;
}

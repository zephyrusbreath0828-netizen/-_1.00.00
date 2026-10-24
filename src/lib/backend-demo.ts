/**
 * デモバックエンド
 *
 * Firebase の環境変数が未設定でも「すぐに触れる MVP」にするための実装。
 * データはすべてブラウザの localStorage に保存される（サーバー送信なし）。
 * API は FirebaseBackend と完全に同一で、切り替えは src/lib/backend.ts が行う。
 */
import { SHRINES } from "@/data/shrines";
import { fileToDataUrl } from "@/lib/photo";
import { devToolsEnabled } from "@/lib/dev-tools";
import type {
  Backend,
  BackendMode,
  Goshuin,
  NewGoshuinInput,
  NewVisitInput,
  SessionUser,
  Shrine,
  UserProfile,
  VisitHistory,
} from "@/lib/types";

const STORE_KEY = "kamitabicho:demo:v1";

type DemoStore = {
  session: SessionUser | null;
  profiles: Record<string, UserProfile>;
  visits: VisitHistory[];
  goshuin: Goshuin[];
};

const emptyStore = (): DemoStore => ({ session: null, profiles: {}, visits: [], goshuin: [] });

function load(): DemoStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<DemoStore>;
    return {
      session: parsed.session ?? null,
      profiles: parsed.profiles ?? {},
      visits: parsed.visits ?? [],
      goshuin: parsed.goshuin ?? [],
    };
  } catch {
    return emptyStore();
  }
}

function save(store: DemoStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // 容量超過（localStorage は概ね 5MB）。写真の保存に失敗した場合は明示的に通知する。
    throw new Error(
      "ブラウザの保存容量を超えました。デモモードでは写真は端末内にのみ保存されます。不要な御朱印を削除するか、Firebase を接続してください。",
    );
  }
}

const uid = () => `demo_${Math.random().toString(36).slice(2, 10)}`;
const iso = () => new Date().toISOString();

/** 動作確認用サンプルの日時を作る */
function daysAgoIso(days: number, hour = 9, minute = 12): string {
  const t = new Date();
  t.setDate(t.getDate() - days);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
}
function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export class DemoBackend implements Backend {
  mode: BackendMode = "demo";
  shrineSource: "firestore" | "bundled" = "bundled";
  private listeners = new Set<(u: SessionUser | null) => void>();
  private store: DemoStore = emptyStore();

  constructor() {
    if (typeof window !== "undefined") {
      this.store = load();
      // 動作確認用: ?autologin=1 でデモセッションを同期的に用意する
      //             &sample=1 を付けるとサンプルの参拝記録・御朱印も投入する
      const params = new URLSearchParams(window.location.search);
      // 検証用の自動ログインは開発ツールが有効なときのみ（本番では無効）
      if (devToolsEnabled() && params.get("autologin") === "1") {
        this.ensureDemoSession(params.get("sample") === "1");
      }
      // 次フレームで購読側へ現在のセッションを知らせる
      setTimeout(() => this.emit(), 0);
    }
  }

  /** 検証用のデモユーザーを即時作成する（初回描画からログイン済みにするため同期処理） */
  private ensureDemoSession(sample: boolean) {
    const DEMO_UID = "demo-user";
    if (!this.store.session || this.store.session.uid !== DEMO_UID) {
      this.store.session = {
        uid: DEMO_UID,
        email: null,
        displayName: "参拝 花子",
        photoURL: null,
        isDemo: true,
      };
    }
    if (!this.store.profiles[DEMO_UID]) {
      this.store.profiles[DEMO_UID] = {
        uid: DEMO_UID,
        nickname: "参拝 花子",
        photo_url: null,
        is_demo: true,
        created_at: iso(),
        updated_at: iso(),
      };
    }
    if (sample && this.store.visits.filter((v) => v.user_id === DEMO_UID).length === 0) {
      const rows: [string, number, number][] = [
        ["伊勢神宮（内宮）", 42, 3],
        ["熱田神宮", 88, 12],
        ["出雲大社", 128, 40],
        ["明治神宮", 265, 120],
      ];
      for (const [name, distance, days] of rows) {
        const s = SHRINES.find((x) => x.name === name);
        if (!s) continue;
        this.store.visits.push({
          id: `visit_demo_${s.id}`,
          user_id: DEMO_UID,
          shrine_id: s.id,
          shrine_name: s.name,
          shrine_prefecture: s.prefecture,
          visited_at: daysAgoIso(days),
          latitude: Number((s.latitude + 0.0003).toFixed(6)),
          longitude: Number((s.longitude - 0.0003).toFixed(6)),
          distance_m: distance,
        });
      }
      const gs: [string, string, number, string][] = [
        ["伊勢神宮（内宮）", "/sample/goshuin-1.png", 3, "早朝参拝。五十鈴川で手を清めてから正宮へ。御朱印は神楽殿でいただきました。"],
        ["出雲大社", "/sample/goshuin-2.png", 40, "大注連縄の下で参拝。縁結びの御神徳をいただきました。"],
      ];
      for (const [name, photo, days, memo] of gs) {
        const s = SHRINES.find((x) => x.name === name);
        if (!s) continue;
        this.store.goshuin.push({
          id: `goshuin_demo_${s.id}`,
          user_id: DEMO_UID,
          shrine_id: s.id,
          shrine_name: s.name,
          photo_url: photo,
          visited_date: ymdDaysAgo(days),
          memo,
          created_at: daysAgoIso(days, 10, 30),
        });
      }
    }
    this.persist();
  }

  describe() {
    return "デモモード（Firebase 未接続）: データはこの端末のブラウザ内にのみ保存されます。";
  }

  private emit() {
    this.listeners.forEach((cb) => cb(this.store.session));
  }

  private persist() {
    save(this.store);
  }

  onAuthChange(cb: (user: SessionUser | null) => void) {
    this.listeners.add(cb);
    if (typeof window !== "undefined") cb(this.store.session);
    return () => {
      this.listeners.delete(cb);
    };
  }

  async signInWithGoogle(): Promise<SessionUser> {
    // デモモードでは Google ログインは行えない（Firebase Authentication が必要）
    throw new Error(
      "Google ログインは Firebase 接続時のみ利用できます。デモモードでは「デモモードで試す」からお進みください。",
    );
  }

  async signInAsDemo(nickname = "ゲスト参拝者"): Promise<SessionUser> {
    const id = uid();
    const user: SessionUser = {
      uid: id,
      email: null,
      displayName: nickname,
      photoURL: null,
      isDemo: true,
    };
    this.store.session = user;
    this.store.profiles[id] = {
      uid: id,
      nickname,
      photo_url: null,
      is_demo: true,
      created_at: iso(),
      updated_at: iso(),
    };
    this.persist();
    this.emit();
    return user;
  }

  async signOut(): Promise<void> {
    this.store.session = null;
    this.persist();
    this.emit();
  }

  async getUserProfile(uidValue: string): Promise<UserProfile | null> {
    return this.store.profiles[uidValue] ?? null;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.store.profiles[profile.uid] = { ...profile, updated_at: iso() };
    if (this.store.session && this.store.session.uid === profile.uid) {
      this.store.session = {
        ...this.store.session,
        displayName: profile.nickname,
        photoURL: profile.photo_url,
      };
    }
    this.persist();
    this.emit();
  }

  async listShrines(): Promise<Shrine[]> {
    this.shrineSource = "bundled";
    // デモモードでは訪問数にローカル記録を加算して返す
    const counts = new Map<string, number>();
    for (const v of this.store.visits) {
      counts.set(v.shrine_id, (counts.get(v.shrine_id) ?? 0) + 1);
    }
    return SHRINES.map((s) => ({ ...s, visit_count: s.visit_count + (counts.get(s.id) ?? 0) }));
  }

  async getShrine(id: string): Promise<Shrine | null> {
    const all = await this.listShrines();
    return all.find((s) => s.id === id) ?? null;
  }

  async addVisit(input: NewVisitInput): Promise<VisitHistory> {
    const shrine = SHRINES.find((s) => s.id === input.shrine_id);
    if (!shrine) throw new Error("神社が見つかりません。");
    const visit: VisitHistory = {
      id: `visit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: input.user_id,
      shrine_id: input.shrine_id,
      shrine_name: shrine.name,
      shrine_prefecture: shrine.prefecture,
      visited_at: input.visited_at ?? iso(),
      latitude: input.latitude,
      longitude: input.longitude,
      distance_m: Math.round(input.distance_m),
    };
    this.store.visits.unshift(visit);
    this.persist();
    return visit;
  }

  async deleteVisit(visitId: string): Promise<void> {
    this.store.visits = this.store.visits.filter((v) => v.id !== visitId);
    this.persist();
  }

  async listVisits(uidValue: string): Promise<VisitHistory[]> {
    return this.store.visits
      .filter((v) => v.user_id === uidValue)
      .sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1));
  }

  async addGoshuin(input: NewGoshuinInput): Promise<Goshuin> {
    const shrine = SHRINES.find((s) => s.id === input.shrine_id);
    if (!shrine) throw new Error("神社が見つかりません。");
    let photoUrl = input.photo_url ?? "";
    if (input.file) {
      photoUrl = await fileToDataUrl(input.file, 900, 0.7);
    }
    const goshuin: Goshuin = {
      id: `goshuin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: input.user_id,
      shrine_id: input.shrine_id,
      shrine_name: shrine.name,
      photo_url: photoUrl,
      visited_date: input.visited_date,
      memo: input.memo ?? "",
      created_at: iso(),
    };
    this.store.goshuin.unshift(goshuin);
    this.persist();
    return goshuin;
  }

  async deleteGoshuin(goshuinId: string): Promise<void> {
    this.store.goshuin = this.store.goshuin.filter((g) => g.id !== goshuinId);
    this.persist();
  }

  async listGoshuin(uidValue: string): Promise<Goshuin[]> {
    return this.store.goshuin
      .filter((g) => g.user_id === uidValue)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async uploadImage(_uidValue: string, kind: "goshuin" | "avatar", file: File): Promise<string> {
    return fileToDataUrl(file, kind === "avatar" ? 400 : 900, kind === "avatar" ? 0.8 : 0.7);
  }
}

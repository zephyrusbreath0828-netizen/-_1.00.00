"use client";

/**
 * アプリ全体の状態管理（React Context）
 * 認証状態・神社マスタ・訪問履歴・御朱印を一箇所で保持し、各画面へ配る。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SHRINES } from "@/data/shrines";
import { getBackend } from "@/lib/backend";
import { isSilentError, toUserMessage } from "@/lib/errors";
import type {
  Backend,
  Goshuin,
  NewGoshuinInput,
  SessionUser,
  Shrine,
  UserProfile,
  VisitHistory,
} from "@/lib/types";

/** 例外を利用者向けメッセージへ変換して投げ直す（画面側で表示する） */
function rethrow(e: unknown): never {
  throw new Error(toUserMessage(e));
}

type AppContextValue = {
  backend: Backend;
  /** 認証状態の初期解決が完了したか */
  ready: boolean;
  user: SessionUser | null;
  profile: UserProfile | null;
  shrines: Shrine[];
  visits: VisitHistory[];
  goshuin: Goshuin[];
  /** 神社マスタの取得元 */
  shrineSource: "firestore" | "bundled";
  error: string | null;
  clearError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: { nickname?: string; photo_url?: string | null }) => Promise<void>;
  uploadImage: (kind: "goshuin" | "avatar", file: File) => Promise<string>;
  checkIn: (shrine: Shrine, position: { latitude: number; longitude: number; distance_m: number }) => Promise<VisitHistory>;
  removeVisit: (visitId: string) => Promise<void>;
  registerGoshuin: (input: Omit<NewGoshuinInput, "user_id">) => Promise<Goshuin>;
  removeGoshuin: (id: string) => Promise<void>;
  shrineById: (id: string) => Shrine | undefined;
  /** 神社ごとの訪問回数 */
  visitCountOf: (shrineId: string) => number;
  visitedShrineIds: string[];
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend] = useState<Backend>(() => getBackend());
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shrines, setShrines] = useState<Shrine[]>(SHRINES);
  const [visits, setVisits] = useState<VisitHistory[]>([]);
  const [goshuin, setGoshuin] = useState<Goshuin[]>([]);
  const [shrineSource, setShrineSource] = useState<"firestore" | "bundled">("bundled");
  const [error, setError] = useState<string | null>(null);


  const loadAccountData = useCallback(
    async (uid: string) => {
      const [p, v, g] = await Promise.all([
        backend.getUserProfile(uid),
        backend.listVisits(uid),
        backend.listGoshuin(uid),
      ]);
      setProfile(p);
      setVisits(v);
      setGoshuin(g);
    },
    [backend],
  );

  useEffect(() => {
    let alive = true;
    const unsub = backend.onAuthChange(async (u) => {
      if (!alive) return;
      setUser(u);
      if (!u) {
        setProfile(null);
        setVisits([]);
        setGoshuin([]);
        setReady(true);
        return;
      }
      try {
        await loadAccountData(u.uid);
      } catch (e) {
        if (alive) setError(toUserMessage(e));
      } finally {
        if (alive) setReady(true);
      }
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [backend, loadAccountData]);

  useEffect(() => {
    let alive = true;
    backend
      .listShrines()
      .then((list) => {
        if (!alive) return;
        setShrines(list);
        setShrineSource(backend.shrineSource ?? "bundled");
      })
      .catch((e) => {
        if (alive) setError(toUserMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [backend]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const u = await backend.signInWithGoogle();
      setUser(u);
      await loadAccountData(u.uid);
    } catch (e) {
      // 利用者が自分で閉じた場合は何も表示しない
      if (!isSilentError(e)) setError(toUserMessage(e, "ログインに失敗しました。"));
    } finally {
      setReady(true);
    }
  }, [backend, loadAccountData]);

  const signInAsDemo = useCallback(async () => {
    setError(null);
    try {
      const u = await backend.signInAsDemo();
      setUser(u);
      await loadAccountData(u.uid);
    } catch (e) {
      setError(toUserMessage(e, "デモモードを開始できませんでした。"));
    } finally {
      setReady(true);
    }
  }, [backend, loadAccountData]);

  const signOut = useCallback(async () => {
    try {
      await backend.signOut();
    } catch (e) {
      setError(toUserMessage(e, "ログアウトに失敗しました。"));
    } finally {
      // 端末側の状態は必ず破棄する
      setUser(null);
      setProfile(null);
      setVisits([]);
      setGoshuin([]);
    }
  }, [backend]);

  const updateProfile = useCallback(
    async (patch: { nickname?: string; photo_url?: string | null }) => {
      if (!user) return;
      const base: UserProfile =
        profile ?? {
          uid: user.uid,
          nickname: user.displayName ?? "参拝者",
          photo_url: user.photoURL ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      const next: UserProfile = { ...base, ...patch };
      try {
        await backend.saveUserProfile(next);
      } catch (e) {
        rethrow(e);
      }
      setProfile(next);
      setUser((u) => (u ? { ...u, displayName: next.nickname, photoURL: next.photo_url } : u));
    },
    [backend, profile, user],
  );

  const uploadImage = useCallback(
    async (kind: "goshuin" | "avatar", file: File) => {
      if (!user) throw new Error("ログインが必要です。");
      try {
        return await backend.uploadImage(user.uid, kind, file);
      } catch (e) {
        rethrow(e);
      }
    },
    [backend, user],
  );

  const checkIn = useCallback(
    async (
      shrine: Shrine,
      position: { latitude: number; longitude: number; distance_m: number },
    ) => {
      if (!user) throw new Error("ログインが必要です。");
      let visit: VisitHistory;
      try {
        visit = await backend.addVisit({
          user_id: user.uid,
          shrine_id: shrine.id,
          latitude: position.latitude,
          longitude: position.longitude,
          distance_m: position.distance_m,
        });
      } catch (e) {
        rethrow(e);
      }
      setVisits((prev) => [visit, ...prev]);
      setShrines((prev) =>
        prev.map((s) => (s.id === shrine.id ? { ...s, visit_count: s.visit_count + 1 } : s)),
      );
      return visit;
    },
    [backend, user],
  );

  const removeVisit = useCallback(
    async (visitId: string) => {
      try {
        await backend.deleteVisit(visitId);
      } catch (e) {
        rethrow(e);
      }
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
    },
    [backend],
  );

  const registerGoshuin = useCallback(
    async (input: Omit<NewGoshuinInput, "user_id">) => {
      if (!user) throw new Error("ログインが必要です。");
      let created: Goshuin;
      try {
        created = await backend.addGoshuin({ ...input, user_id: user.uid });
      } catch (e) {
        rethrow(e);
      }
      setGoshuin((prev) => [created, ...prev]);
      return created;
    },
    [backend, user],
  );

  const removeGoshuin = useCallback(
    async (id: string) => {
      try {
        await backend.deleteGoshuin(id);
      } catch (e) {
        rethrow(e);
      }
      setGoshuin((prev) => prev.filter((g) => g.id !== id));
    },
    [backend],
  );

  const shrineMap = useMemo(() => new Map(shrines.map((s) => [s.id, s])), [shrines]);
  const visitCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of visits) m.set(v.shrine_id, (m.get(v.shrine_id) ?? 0) + 1);
    return m;
  }, [visits]);

  const value: AppContextValue = {
    backend,
    ready,
    user,
    profile,
    shrines,
    visits,
    goshuin,
    shrineSource,
    error,
    clearError: () => setError(null),
    signInWithGoogle,
    signInAsDemo,
    signOut,
    updateProfile,
    uploadImage,
    checkIn,
    removeVisit,
    registerGoshuin,
    removeGoshuin,
    shrineById: (id: string) => shrineMap.get(id),
    visitCountOf: (shrineId: string) => visitCountMap.get(shrineId) ?? 0,
    visitedShrineIds: Array.from(visitCountMap.keys()),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp は AppProvider の内側で使用してください。");
  return ctx;
}

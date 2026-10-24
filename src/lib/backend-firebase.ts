/**
 * Firebase バックエンド実装
 *   Authentication : Google ログイン（signInWithPopup）
 *   Firestore      : users / shrines / visit_history / goshuin の4コレクション
 *   Storage        : goshuin/{uid}/... と avatars/{uid}/...
 *
 * 必要な Firestore 複合インデックスは docs/DEPLOY.md を参照。
 * インデックス未作成でも動作するよう、orderBy 付きクエリが失敗した場合は
 * 取得のみ行いクライアント側でソートするフォールバックを備える。
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { SHRINES } from "@/data/shrines";
import { COLLECTIONS, STORAGE_PATHS, getDb, getFbAuth, getFbStorage } from "@/lib/firebase";
import { buildFileName } from "@/lib/photo";
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

const iso = () => new Date().toISOString();
const noIndex = (e: unknown) =>
  /failed-precondition|requires an index|index/i.test(String((e as Error)?.message ?? e));

export class FirebaseBackend implements Backend {
  mode: BackendMode = "firebase";
  shrineSource: "firestore" | "bundled" = "firestore";

  describe() {
    return "Firebase モード: Firestore と Firebase Storage にデータを保存します。";
  }

  onAuthChange(cb: (user: SessionUser | null) => void) {
    return onAuthStateChanged(getFbAuth(), async (fbUser: User | null) => {
      if (!fbUser) {
        cb(null);
        return;
      }
      try {
        await this.ensureProfile(fbUser);
      } catch (e) {
        // プロフィール作成に失敗してもログイン自体は継続させる
        console.error("[神旅帳] プロフィールの初期化に失敗しました", e);
      }
      cb({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        isDemo: false,
      });
    });
  }

  async signInWithGoogle(): Promise<SessionUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(getFbAuth(), provider);
    await this.ensureProfile(cred.user);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      isDemo: false,
    };
  }

  async signInAsDemo(): Promise<SessionUser> {
    throw new Error(
      "Firebase 接続中はデモログインを利用できません。URL の末尾に ?demo=1 を付けるとデモモードで起動します。",
    );
  }

  async signOut(): Promise<void> {
    await fbSignOut(getFbAuth());
  }

  /** users/{uid} が無ければ Google アカウント情報から作成する */
  private async ensureProfile(fbUser: User): Promise<void> {
    const ref = doc(getDb(), COLLECTIONS.users, fbUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    const profile: UserProfile = {
      uid: fbUser.uid,
      nickname: fbUser.displayName ?? "参拝者",
      photo_url: fbUser.photoURL ?? null,
      created_at: iso(),
      updated_at: iso(),
    };
    await setDoc(ref, profile);
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.users, uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await setDoc(
      doc(getDb(), COLLECTIONS.users, profile.uid),
      { ...profile, updated_at: iso() },
      { merge: true },
    );
  }

  async listShrines(): Promise<Shrine[]> {
    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.shrines), orderBy("prefecture")));
    if (snap.empty) {
      // シード未投入。同梱データで機能を維持する（docs/DEPLOY.md の seed 手順を実行してください）
      console.warn("[神旅帳] Firestore の shrines が空です。同梱データを表示します。`npm run seed` を実行してください。");
      this.shrineSource = "bundled";
      return SHRINES;
    }
    this.shrineSource = "firestore";
    return snap.docs.map((d) => ({ ...(d.data() as Shrine), id: d.id }));
  }

  async getShrine(id: string): Promise<Shrine | null> {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.shrines, id));
    if (snap.exists()) return { ...(snap.data() as Shrine), id: snap.id };
    return SHRINES.find((s) => s.id === id) ?? null;
  }

  async addVisit(input: NewVisitInput): Promise<VisitHistory> {
    const shrine = (await this.getShrine(input.shrine_id)) ?? SHRINES.find((s) => s.id === input.shrine_id);
    if (!shrine) throw new Error("神社が見つかりません。");
    const payload = {
      user_id: input.user_id,
      shrine_id: input.shrine_id,
      shrine_name: shrine.name,
      shrine_prefecture: shrine.prefecture,
      visited_at: input.visited_at ?? iso(),
      latitude: input.latitude,
      longitude: input.longitude,
      distance_m: Math.round(input.distance_m),
    };
    const created = await addDoc(collection(getDb(), COLLECTIONS.visitHistory), payload);
    // 訪問数の集計（失敗してもチェックイン自体は成立させる）
    try {
      await updateDoc(doc(getDb(), COLLECTIONS.shrines, input.shrine_id), {
        visit_count: increment(1),
      });
    } catch {
      /* 集計は将来 Cloud Functions で行う想定のベストエフォート処理 */
    }
    return { id: created.id, ...payload };
  }

  async deleteVisit(visitId: string): Promise<void> {
    const ref = doc(getDb(), COLLECTIONS.visitHistory, visitId);
    // 神社の訪問数を戻すために、削除前に対象神社を取得する
    let shrineId: string | null = null;
    try {
      const snap = await getDoc(ref);
      shrineId = snap.exists() ? ((snap.data() as VisitHistory).shrine_id ?? null) : null;
    } catch (e) {
      console.warn("[神旅帳] 訪問記録の取得に失敗しました（削除は継続します）", e);
    }
    await deleteDoc(ref);
    if (shrineId) {
      try {
        await updateDoc(doc(getDb(), COLLECTIONS.shrines, shrineId), { visit_count: increment(-1) });
      } catch {
        // 集計のみの失敗は無視する（訪問記録の削除は成立している）
      }
    }
  }

  async listVisits(uid: string): Promise<VisitHistory[]> {
    const col = collection(getDb(), COLLECTIONS.visitHistory);
    try {
      const snap = await getDocs(
        query(col, where("user_id", "==", uid), orderBy("visited_at", "desc")),
      );
      return snap.docs.map((d) => ({ ...(d.data() as VisitHistory), id: d.id }));
    } catch (e) {
      if (!noIndex(e)) throw e;
      const snap = await getDocs(query(col, where("user_id", "==", uid)));
      return snap.docs
        .map((d) => ({ ...(d.data() as VisitHistory), id: d.id }))
        .sort((a, b) => (a.visited_at < b.visited_at ? 1 : -1));
    }
  }

  async addGoshuin(input: NewGoshuinInput): Promise<Goshuin> {
    const shrine = (await this.getShrine(input.shrine_id)) ?? SHRINES.find((s) => s.id === input.shrine_id);
    if (!shrine) throw new Error("神社が見つかりません。");
    let photoUrl = input.photo_url ?? "";
    if (input.file) {
      photoUrl = await this.uploadImage(input.user_id, "goshuin", input.file);
    }
    const payload = {
      user_id: input.user_id,
      shrine_id: input.shrine_id,
      shrine_name: shrine.name,
      photo_url: photoUrl,
      visited_date: input.visited_date,
      memo: input.memo ?? "",
      created_at: iso(),
    };
    const created = await addDoc(collection(getDb(), COLLECTIONS.goshuin), payload);
    return { id: created.id, ...payload };
  }

  async deleteGoshuin(goshuinId: string): Promise<void> {
    const ref = doc(getDb(), COLLECTIONS.goshuin, goshuinId);
    // Storage の写真も合わせて削除する（孤立ファイルを残さない）
    try {
      const snap = await getDoc(ref);
      const photoUrl = snap.exists() ? (snap.data() as Goshuin).photo_url : "";
      if (photoUrl && /^https:\/\//.test(photoUrl)) {
        await deleteObject(storageRef(getFbStorage(), photoUrl));
      }
    } catch (e) {
      console.warn("[神旅帳] 写真の削除に失敗しました（記録の削除は継続します）", e);
    }
    await deleteDoc(ref);
  }

  async listGoshuin(uid: string): Promise<Goshuin[]> {
    const col = collection(getDb(), COLLECTIONS.goshuin);
    try {
      const snap = await getDocs(query(col, where("user_id", "==", uid), orderBy("created_at", "desc")));
      return snap.docs.map((d) => ({ ...(d.data() as Goshuin), id: d.id }));
    } catch (e) {
      if (!noIndex(e)) throw e;
      const snap = await getDocs(query(col, where("user_id", "==", uid)));
      return snap.docs
        .map((d) => ({ ...(d.data() as Goshuin), id: d.id }))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
  }

  async uploadImage(uid: string, kind: "goshuin" | "avatar", file: File): Promise<string> {
    const path =
      kind === "avatar"
        ? STORAGE_PATHS.avatar(uid, buildFileName("avatar", file))
        : STORAGE_PATHS.goshuin(uid, buildFileName("goshuin", file));
    const ref = storageRef(getFbStorage(), path);
    const snapshot = await uploadBytes(ref, file, { contentType: file.type || "image/jpeg" });
    return getDownloadURL(snapshot.ref);
  }
}

"use client";

/** プロフィール編集: ニックネーム / プロフィール画像 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/app-context";
import { toUserMessage } from "@/lib/errors";
import { fileToDataUrl, validateImage } from "@/lib/photo";

export default function ProfilePage() {
  const { profile, user, updateProfile, uploadImage, backend } = useApp();
  const router = useRouter();
  const [nickname, setNickname] = useState(profile?.nickname ?? user?.displayName ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.photo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    const msg = validateImage(file);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    try {
      if (backend.mode === "firebase") {
        const url = await uploadImage("avatar", file);
        setPhotoUrl(url);
      } else {
        setPhotoUrl(await fileToDataUrl(file, 400, 0.8));
      }
    } catch (e) {
      setError(toUserMessage(e, "画像を読み込めませんでした。"));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("ニックネームを入力してください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ nickname: nickname.trim(), photo_url: photoUrl });
      setMessage("プロフィールを保存しました。");
      setTimeout(() => router.push("/mypage"), 700);
    } catch (err) {
      setError(toUserMessage(err, "プロフィールを保存できませんでした。"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="プロフィール" subtitle="ニックネームと画像を設定します" backHref="/mypage" />

      <form className="space-y-4 px-4 py-4" onSubmit={save}>
        <section className="wa-card flex flex-col items-center gap-3 p-5">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-washi-line bg-washi-deep">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mincho text-3xl text-sumi-mute">
                {(nickname || "参").slice(0, 1)}
              </div>
            )}
          </div>
          <label className="btn btn-outline cursor-pointer">
            プロフィール画像を選ぶ
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
            />
          </label>
          {photoUrl && (
            <button type="button" className="text-[0.8rem] text-sumi-mute underline" onClick={() => setPhotoUrl(null)}>
              画像を削除
            </button>
          )}
          <p className="text-center text-[0.74rem] leading-snug text-sumi-mute">
            {backend.mode === "firebase"
              ? "Firebase Storage（avatars/{uid}/）に保存されます。"
              : "デモモードでは端末のブラウザ内にのみ保存されます。"}
          </p>
        </section>

        <section className="wa-card p-4">
          <label className="block text-[0.86rem] font-semibold" htmlFor="nickname">
            ニックネーム
          </label>
          <input
            id="nickname"
            className="field mt-2"
            value={nickname}
            maxLength={24}
            placeholder="例：参拝太郎"
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="mt-1 text-right text-[0.74rem] text-sumi-mute">{nickname.length} / 24</p>
        </section>

        {message && (
          <p className="rounded-[10px] border border-mori/30 bg-[rgba(76,107,79,0.1)] px-3 py-2 text-[0.86rem] text-mori">
            ✓ {message}
          </p>
        )}
        {error && (
          <p className="rounded-[10px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.86rem] text-shu-deep">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "保存しています…" : "保存する"}
        </button>
      </form>
    </div>
  );
}

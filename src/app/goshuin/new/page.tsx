"use client";

/** 御朱印の新規登録: 神社 / 写真 / 参拝日 / メモ */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/app-context";
import { toUserMessage } from "@/lib/errors";
import { fileToDataUrl, validateImage } from "@/lib/photo";

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function NewGoshuinPage() {
  const { shrines, registerGoshuin, backend } = useApp();
  const router = useRouter();

  const [shrineId, setShrineId] = useState("");
  const [visitedDate, setVisitedDate] = useState(today());
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("shrine");
    if (preset) setShrineId(preset);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof shrines>();
    for (const s of shrines) {
      const list = map.get(s.prefecture) ?? [];
      list.push(s);
      map.set(s.prefecture, list);
    }
    return Array.from(map.entries());
  }, [shrines]);

  const onFile = async (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const msg = validateImage(f);
    if (msg) {
      setError(msg);
      return;
    }
    setFile(f);
    setPreview(await fileToDataUrl(f, 900, 0.75));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shrineId) {
      setError("神社を選択してください。");
      return;
    }
    if (!file) {
      setError("御朱印の写真を選択してください。");
      return;
    }
    if (visitedDate > today()) {
      setError("参拝日に未来の日付は指定できません。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await registerGoshuin({
        shrine_id: shrineId,
        visited_date: visitedDate,
        memo,
        file,
      });
      router.push("/goshuin");
    } catch (err) {
      setError(toUserMessage(err, "御朱印を保存できませんでした。"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="御朱印を登録" subtitle="写真・参拝日・メモを保存します" backHref="/goshuin" />

      <form className="space-y-4 px-4 py-4" onSubmit={submit}>
        <div className="wa-card p-4">
          <label className="block text-[0.86rem] font-semibold" htmlFor="shrine">
            神社 <span className="text-shu">必須</span>
          </label>
          <select id="shrine" className="field mt-2" value={shrineId} onChange={(e) => setShrineId(e.target.value)}>
            <option value="">選択してください</option>
            {grouped.map(([pref, list]) => (
              <optgroup key={pref} label={pref}>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="wa-card p-4">
          <label className="block text-[0.86rem] font-semibold" htmlFor="photo">
            御朱印の写真 <span className="text-shu">必須</span>
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="mt-2 block w-full text-[0.85rem]"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[0.76rem] leading-snug text-sumi-mute">
            {backend.mode === "firebase"
              ? "写真は Firebase Storage（goshuin/{uid}/）にアップロードされます。"
              : "デモモードでは写真は端末のブラウザ内にのみ保存されます（最大8MB）。"}
          </p>
          {preview && (
            <img src={preview} alt="プレビュー" className="mt-3 max-h-64 w-full rounded-[10px] object-contain bg-washi-deep" />
          )}
        </div>

        <div className="wa-card p-4">
          <label className="block text-[0.86rem] font-semibold" htmlFor="date">
            参拝日
          </label>
          <input
            id="date"
            type="date"
            className="field mt-2"
            value={visitedDate}
            max={today()}
            onChange={(e) => setVisitedDate(e.target.value)}
          />
        </div>

        <div className="wa-card p-4">
          <label className="block text-[0.86rem] font-semibold" htmlFor="memo">
            メモ
          </label>
          <textarea
            id="memo"
            className="field mt-2 min-h-[110px]"
            placeholder="例：早朝参拝。御朱印は授与所でいただきました。"
            value={memo}
            maxLength={300}
            onChange={(e) => setMemo(e.target.value)}
          />
          <p className="mt-1 text-right text-[0.74rem] text-sumi-mute">{memo.length} / 300</p>
        </div>

        {error && (
          <p className="rounded-[10px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.86rem] text-shu-deep">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pb-2">
          <Link href="/goshuin" className="btn btn-outline w-full">
            キャンセル
          </Link>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "保存しています…" : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

/** 御朱印帳: 登録した御朱印写真の一覧 */
import Link from "next/link";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/app-context";
import { toUserMessage } from "@/lib/errors";

export default function GoshuinPage() {
  const { goshuin, removeGoshuin } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = goshuin.find((g) => g.id === activeId) ?? null;

  return (
    <div>
      <PageHeader
        title="御朱印帳"
        subtitle={`登録 ${goshuin.length}枚`}
        action={
          <Link href="/goshuin/new" className="btn btn-outline min-h-[42px] px-3 text-[0.86rem]">
            ＋ 登録
          </Link>
        }
      />

      <div className="px-4 py-4">
        {goshuin.length === 0 ? (
          <div className="wa-card px-5 py-10 text-center">
            <p className="text-3xl">朱印</p>
            <p className="font-mincho mt-3 text-[1.05rem] font-semibold">御朱印帳はまだ空です</p>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-sumi-mute">
              参拝した証の御朱印を写真で保存しましょう。
              <br />
              神社名・参拝日・メモを添えて記録できます。
            </p>
            <Link href="/goshuin/new" className="btn btn-primary mt-4 w-full">
              御朱印を登録する
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {goshuin.map((g) => (
              <div key={g.id} className="wa-card overflow-hidden">
                <button className="block w-full" onClick={() => setActiveId(g.id)}>
                  <img
                    src={g.photo_url}
                    alt={`${g.shrine_name}の御朱印`}
                    className="h-36 w-full object-cover bg-washi-deep"
                  />
                  <div className="px-3 py-2 text-left">
                    <p className="font-mincho truncate text-[0.95rem] font-semibold">{g.shrine_name}</p>
                    <p className="text-[0.74rem] text-sumi-mute">{g.visited_date}</p>
                    {g.memo && <p className="mt-1 line-clamp-2 text-[0.76rem] text-sumi-soft">{g.memo}</p>}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0"
          onClick={() => setActiveId(null)}
        >
          <div
            className="modal-sheet w-full max-w-[520px] rounded-t-[16px] bg-[#fffdf8] p-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={active.photo_url} alt="" className="max-h-[52vh] w-full rounded-[12px] object-contain bg-washi-deep" />
            <div className="mt-3">
              <p className="font-mincho text-[1.1rem] font-semibold">{active.shrine_name}</p>
              <p className="text-[0.8rem] text-sumi-mute">
                参拝日 {active.visited_date}・登録 {new Date(active.created_at).toLocaleDateString("ja-JP")}
              </p>
              {active.memo && <p className="mt-2 text-[0.9rem] leading-relaxed">{active.memo}</p>}
            </div>
            {actionError && (
              <p className="mt-3 rounded-[10px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.84rem] text-shu-deep">
                {actionError}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/shrines/${active.shrine_id}`} className="btn btn-outline w-full">
                神社を見る
              </Link>
              <button
                className="btn btn-outline w-full text-shu"
                onClick={async () => {
                  if (!window.confirm("この御朱印を削除しますか？写真も削除されます。")) return;
                  setActionError(null);
                  try {
                    await removeGoshuin(active.id);
                    setActiveId(null);
                  } catch (e) {
                    setActionError(toUserMessage(e, "御朱印を削除できませんでした。"));
                  }
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

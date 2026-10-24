"use client";

/** マイページ: 総参拝数 / 訪問履歴 / 登録御朱印数 / プロフィール編集 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useApp } from "@/lib/app-context";
import { toUserMessage } from "@/lib/errors";
import { formatDistance } from "@/lib/geo";

export default function MyPage() {
  const {
    user,
    profile,
    visits,
    goshuin,
    shrines,
    visitedShrineIds,
    removeVisit,
    signOut,
    backend,
  } = useApp();
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);

  const prefecturesVisited = new Set(
    visits
      .map((v) => v.shrine_prefecture || shrines.find((s) => s.id === v.shrine_id)?.prefecture || "")
      .filter(Boolean),
  ).size;

  return (
    <div>
      <PageHeader title="マイページ" subtitle="参拝の記録とプロフィール" />

      <div className="space-y-4 px-4 py-4">
        {/* プロフィール */}
        <section className="wa-card flex items-center gap-4 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-washi-line bg-washi-deep">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mincho text-2xl text-sumi-mute">
                {(profile?.nickname ?? "参").slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mincho text-[1.15rem] font-semibold">{profile?.nickname ?? "参拝者"}</p>
            <p className="truncate text-[0.78rem] text-sumi-mute">{user?.email ?? "ゲスト（デモモード）"}</p>
          </div>
          <Link href="/profile" className="btn btn-outline min-h-[42px] shrink-0 px-3 text-[0.84rem]">
            編集
          </Link>
        </section>

        {/* 集計 */}
        <section className="wa-card grid grid-cols-2 gap-px overflow-hidden bg-washi-line">
          {[
            { label: "総参拝回数", value: visits.length, unit: "回" },
            { label: "参拝した神社", value: visitedShrineIds.length, unit: `/${shrines.length}社` },
            { label: "登録御朱印", value: goshuin.length, unit: "枚" },
            { label: "めぐった都道府県", value: prefecturesVisited, unit: "/47" },
          ].map((s) => (
            <div key={s.label} className="bg-[#fffdf8] px-4 py-3">
              <p className="text-[0.76rem] text-sumi-mute">{s.label}</p>
              <p className="font-mincho text-[1.5rem] leading-tight font-semibold text-shu">
                {s.value}
                <span className="ml-1 text-[0.7rem] font-normal text-sumi-mute">{s.unit}</span>
              </p>
            </div>
          ))}
        </section>

        {/* 訪問履歴 */}
        <section>
          <h2 className="mb-2 font-mincho text-[1.05rem] font-semibold">訪問履歴</h2>
          {actionError && (
            <p className="mb-2 rounded-[10px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.84rem] text-shu-deep">
              {actionError}
            </p>
          )}
          {visits.length === 0 ? (
            <p className="wa-card p-4 text-[0.88rem] leading-relaxed text-sumi-mute">
              まだ参拝記録がありません。神社詳細画面で「参拝記録を登録」から追加できます。
            </p>
          ) : (
            <ul className="wa-card divide-y divide-washi-line">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/shrines/${v.shrine_id}`} className="font-mincho block truncate text-[1rem] font-semibold">
                      {v.shrine_name}
                    </Link>
                    <p className="text-[0.76rem] text-sumi-mute">
                      {new Date(v.visited_at).toLocaleString("ja-JP")}・神社から {formatDistance(v.distance_m)}
                    </p>
                  </div>
                  <button
                    className="shrink-0 text-[0.78rem] text-sumi-mute underline"
                    onClick={async () => {
                      if (!window.confirm(`${v.shrine_name}の参拝記録を削除しますか？`)) return;
                      setActionError(null);
                      try {
                        await removeVisit(v.id);
                      } catch (e) {
                        setActionError(toUserMessage(e, "参拝記録を削除できませんでした。"));
                      }
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 御朱印 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-mincho text-[1.05rem] font-semibold">登録御朱印</h2>
            <Link href="/goshuin" className="text-[0.82rem] font-semibold text-shu underline">
              御朱印帳を見る
            </Link>
          </div>
          {goshuin.length === 0 ? (
            <p className="wa-card p-4 text-[0.88rem] text-sumi-mute">まだ御朱印が登録されていません。</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {goshuin.slice(0, 8).map((g) => (
                <Link key={g.id} href="/goshuin" className="wa-card overflow-hidden">
                  <img src={g.photo_url} alt={g.shrine_name} className="h-20 w-full object-cover" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="wa-card p-4 text-[0.8rem] leading-relaxed text-sumi-mute">
          <p className="font-semibold text-sumi-soft">動作モード</p>
          <p>{backend.describe()}</p>
          <p className="mt-1">
            保存先コレクション：users / shrines / visit_history / goshuin
          </p>
        </section>

        <button
          className="btn btn-outline w-full text-shu"
          onClick={async () => {
            if (window.confirm("ログアウトしますか？")) {
              await signOut();
              router.replace("/login");
            }
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

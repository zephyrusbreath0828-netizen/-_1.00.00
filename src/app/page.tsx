"use client";

/**
 * ホーム画面
 * 現在地表示 / 地図 / 周辺神社 / 神社検索 / 訪問済件数
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ShrineCard from "@/components/ShrineCard";
import ShrineMap, { type MapMarker } from "@/components/ShrineMap";
import { useApp } from "@/lib/app-context";
import { devToolsEnabled } from "@/lib/dev-tools";
import { CHECKIN_RADIUS_M, distanceMeters, formatDistance, formatLatLng } from "@/lib/geo";
import { usePosition, useTestPosition } from "@/lib/use-position";

export default function HomePage() {
  const { user, profile, shrines, visits, goshuin, visitedShrineIds, visitCountOf } = useApp();
  const { position, loading, error, locate } = usePosition();
  const { setTest } = useTestPosition();
  const [query, setQuery] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [showDevTools] = useState(() => devToolsEnabled());
  const router = useRouter();

  // 初回表示で自動的に現在地を取得（拒否されても画面は機能する）
  useEffect(() => {
    if (!position) void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearby = useMemo(() => {
    if (!position) return [];
    return shrines
      .map((s) => ({
        shrine: s,
        distance: distanceMeters(
          { latitude: position.latitude, longitude: position.longitude },
          { latitude: s.latitude, longitude: s.longitude },
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [position, shrines]);

  const visitedCount = visitedShrineIds.length;
  const within300 = nearby.filter((n) => n.distance <= CHECKIN_RADIUS_M).length;

  const markers: MapMarker[] = [
    ...nearby.slice(0, 4).map((n) => ({
      id: n.shrine.id,
      name: n.shrine.name,
      latitude: n.shrine.latitude,
      longitude: n.shrine.longitude,
      kind: (visitedShrineIds.includes(n.shrine.id) ? "visited" : "shrine") as MapMarker["kind"],
    })),
  ];
  if (position) {
    markers.push({
      id: "current",
      name: "現在地",
      latitude: position.latitude,
      longitude: position.longitude,
      kind: "current",
    });
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/shrines?q=${encodeURIComponent(query.trim())}` : "/shrines");
  };

  return (
    <div className="min-h-dvh">
      <header className="bg-mokume pt-safe text-washi">
        <div className="flex items-end justify-between px-4 pt-4 pb-3">
          <div>
            <p className="text-[0.72rem] tracking-[0.3em] text-washi/70">KAMITABICHO</p>
            <h1 className="font-mincho text-[1.6rem] leading-tight font-semibold tracking-[0.12em]">
              神旅帳
            </h1>
          </div>
          <Link
            href="/profile"
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/15 text-lg"
            aria-label="プロフィール"
          >
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{(profile?.nickname ?? user?.displayName ?? "参").slice(0, 1)}</span>
            )}
          </Link>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-shu via-kin-soft to-transparent" />
      </header>

      <div className="space-y-4 px-4 py-4">
        <p className="font-mincho text-[1.02rem]">
          ようこそ、{profile?.nickname ?? user?.displayName ?? "参拝者"} さま
        </p>

        {/* 訪問済件数 */}
        <section className="wa-card grid grid-cols-3 divide-x divide-washi-line py-3 text-center">
          {[
            { label: "参拝した神社", value: `${visitedCount}`, unit: `/ ${shrines.length}社` },
            { label: "総参拝回数", value: `${visits.length}`, unit: "回" },
            { label: "御朱印", value: `${goshuin.length}`, unit: "枚" },
          ].map((s) => (
            <div key={s.label} className="px-2">
              <p className="text-[0.72rem] text-sumi-mute">{s.label}</p>
              <p className="font-mincho text-[1.6rem] leading-tight font-semibold text-shu">
                {s.value}
                <span className="ml-1 text-[0.7rem] font-normal text-sumi-mute">{s.unit}</span>
              </p>
            </div>
          ))}
        </section>

        {/* 検索 */}
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="神社名で検索（例: 伊勢神宮）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="神社名で検索"
          />
          <button type="submit" className="btn btn-primary px-5">
            検索
          </button>
        </form>

        {/* 現在地 */}
        <section className="wa-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mincho text-[1.05rem] font-semibold">現在地</h2>
            <button className="btn btn-outline min-h-[42px] px-3 text-[0.86rem]" onClick={() => void locate()} disabled={loading}>
              {loading ? "取得中…" : "位置情報を更新"}
            </button>
          </div>

          {position ? (
            <div className="mt-2 text-[0.86rem] text-sumi-soft">
              <p className="font-medium text-sumi">{position.label}</p>
              <p className="text-[0.78rem] text-sumi-mute">
                {formatLatLng(position.latitude, position.longitude)}
                {position.accuracy ? `・精度 約${Math.round(position.accuracy)}m` : ""}
              </p>
              {within300 > 0 && (
                <p className="mt-2 rounded-[10px] bg-[rgba(76,107,79,0.1)] px-3 py-2 text-[0.84rem] text-mori">
                  ⛩ すぐ近くに {within300}社 あります。神社詳細から参拝記録を登録できます。
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[0.86rem] leading-relaxed text-sumi-mute">
              {error ?? "位置情報を取得すると、近くの神社と参拝記録の登録ができます。"}
            </p>
          )}

          {showDevTools && (
            <>
              <button
                className="mt-3 text-[0.82rem] font-semibold text-mokume underline"
                onClick={() => setShowTest((v) => !v)}
              >
                動作確認用の位置情報を設定する
              </button>

              {showTest && (
                <div className="mt-2 rounded-[10px] border border-washi-line bg-washi-deep/60 p-3">
                  <p className="text-[0.78rem] leading-snug text-sumi-soft">
                    神社の境内にいなくてもチェックインを試せるように、任意の神社の座標を「現在地」として設定できます（開発・検証用）。
                  </p>
                  <select
                    className="field mt-2"
                    defaultValue=""
                    onChange={(e) => {
                      const s = shrines.find((x) => x.id === e.target.value);
                      if (s) setTest(s.latitude, s.longitude, `${s.name}（テスト位置）`);
                    }}
                  >
                    <option value="">神社を選択してください</option>
                    {shrines.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.prefecture}｜{s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </section>

        {/* 地図 */}
        <ShrineMap markers={markers} center={position} height={220} zoom={position ? 13 : 6} />

        {/* 周辺の神社 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-mincho text-[1.05rem] font-semibold">近くの神社</h2>
            <Link href="/shrines" className="text-[0.82rem] font-semibold text-shu underline">
              すべて見る
            </Link>
          </div>
          {position ? (
            <div className="space-y-2.5">
              {nearby.map((n) => (
                <ShrineCard
                  key={n.shrine.id}
                  shrine={n.shrine}
                  distance={n.distance}
                  visited={visitedShrineIds.includes(n.shrine.id)}
                  visitCount={visitCountOf(n.shrine.id)}
                />
              ))}
            </div>
          ) : (
            <p className="wa-card p-4 text-[0.88rem] text-sumi-mute">
              位置情報を取得すると、現在地から近い順に神社を表示します。
            </p>
          )}
        </section>

        {/* 最近の参拝記録 */}
        {visits.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-mincho text-[1.05rem] font-semibold">最近の参拝記録</h2>
              <Link href="/mypage" className="text-[0.82rem] font-semibold text-shu underline">
                履歴を見る
              </Link>
            </div>
            <ul className="wa-card divide-y divide-washi-line">
              {visits.slice(0, 3).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{v.shrine_name}</p>
                    <p className="text-[0.76rem] text-sumi-mute">
                      {new Date(v.visited_at).toLocaleString("ja-JP")}・神社から {formatDistance(v.distance_m)}
                    </p>
                  </div>
                  <Link href={`/shrines/${v.shrine_id}`} className="shrink-0 text-[0.8rem] text-shu underline">
                    詳細
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

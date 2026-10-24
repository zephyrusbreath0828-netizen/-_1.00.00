"use client";

/** 神社詳細: 神社名 / 画像 / 住所 / 祭神 / 説明 / 地図 / 訪問記録数 / チェックイン / 御朱印登録 */
import Link from "next/link";
import { useParams } from "next/navigation";
import CheckInPanel from "@/components/CheckInPanel";
import PageHeader from "@/components/PageHeader";
import ShrineMap, { type MapMarker } from "@/components/ShrineMap";
import { useApp } from "@/lib/app-context";
import { formatDistance, formatLatLng } from "@/lib/geo";
import { usePosition } from "@/lib/use-position";

export default function ShrineDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { shrineById, visits, goshuin, user } = useApp();
  const { position } = usePosition();
  const shrine = shrineById(id);

  if (!shrine) {
    return (
      <div>
        <PageHeader title="神社が見つかりません" backHref="/shrines" />
        <p className="px-4 py-6 text-[0.9rem] text-sumi-soft">
          指定された神社は登録されていません。
          <Link href="/shrines" className="ml-1 text-shu underline">
            神社一覧へ
          </Link>
        </p>
      </div>
    );
  }

  const myVisits = visits.filter((v) => v.shrine_id === shrine.id);
  const myGoshuin = goshuin.filter((g) => g.shrine_id === shrine.id);
  const markers: MapMarker[] = [
    { id: shrine.id, name: shrine.name, latitude: shrine.latitude, longitude: shrine.longitude, kind: "shrine" },
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

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${shrine.latitude},${shrine.longitude}`;

  return (
    <div className="pb-4">
      <PageHeader title={shrine.name} subtitle={`${shrine.prefecture}｜${shrine.main_deity}`} backHref="/shrines" />

      <div className="px-4">
        <div
          className="-mt-2 h-44 w-full rounded-b-[14px] bg-washi-deep"
          style={{
            backgroundImage: `url(${shrine.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid var(--color-washi-line)",
          }}
          role="img"
          aria-label={`${shrine.name}の画像`}
        />
      </div>

      <div className="space-y-4 px-4 py-4">
        <section className="wa-card divide-y divide-washi-line">
          <dl className="px-4 py-3">
            <dt className="text-[0.76rem] text-sumi-mute">住所</dt>
            <dd className="text-[0.95rem]">{shrine.address}</dd>
          </dl>
          <dl className="px-4 py-3">
            <dt className="text-[0.76rem] text-sumi-mute">ご祭神</dt>
            <dd className="font-mincho text-[1rem]">{shrine.main_deity}</dd>
          </dl>
          <dl className="px-4 py-3">
            <dt className="text-[0.76rem] text-sumi-mute">由緒・ご利益</dt>
            <dd className="text-[0.93rem] leading-relaxed">{shrine.description}</dd>
          </dl>
          <dl className="px-4 py-3">
            <dt className="text-[0.76rem] text-sumi-mute">座標</dt>
            <dd className="text-[0.85rem] text-sumi-soft">{formatLatLng(shrine.latitude, shrine.longitude)}</dd>
          </dl>
        </section>

        <section className="wa-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mincho text-[1.05rem] font-semibold">参拝記録数</h2>
            <span className="font-mincho text-[1.4rem] font-semibold text-shu">
              {shrine.visit_count.toLocaleString("ja-JP")}
              <span className="ml-1 text-[0.72rem] font-normal text-sumi-mute">件</span>
            </span>
          </div>
          <p className="mt-1 text-[0.82rem] text-sumi-mute">
            あなたの参拝：{myVisits.length}回
            {myVisits.length > 0 && `（最終 ${new Date(myVisits[0].visited_at).toLocaleDateString("ja-JP")} / 神社から ${formatDistance(myVisits[0].distance_m)}）`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/goshuin/new?shrine=${shrine.id}`} className="btn btn-outline w-full">
              御朱印を登録
            </Link>
            <a className="btn btn-outline w-full" href={gmaps} target="_blank" rel="noreferrer">
              地図アプリで開く
            </a>
          </div>
        </section>

        <ShrineMap markers={markers} center={{ latitude: shrine.latitude, longitude: shrine.longitude }} height={220} zoom={15} />

        <CheckInPanel shrine={shrine} />

        {myGoshuin.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-mincho text-[1.05rem] font-semibold">この神社の御朱印</h2>
              <Link href="/goshuin" className="text-[0.82rem] font-semibold text-shu underline">
                御朱印帳へ
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {myGoshuin.map((g) => (
                <div key={g.id} className="wa-card overflow-hidden">
                  <img src={g.photo_url} alt={`${g.shrine_name}の御朱印`} className="h-24 w-full object-cover" />
                  <p className="px-2 py-1 text-[0.7rem] text-sumi-mute">{g.visited_date}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!user && (
          <p className="wa-card p-4 text-center text-[0.86rem] text-sumi-mute">ログインすると参拝記録を登録できます。</p>
        )}
      </div>
    </div>
  );
}

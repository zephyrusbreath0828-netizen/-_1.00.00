"use client";

/**
 * GPS チェックイン パネル
 * 現在地と神社の距離をヘヴァサイン公式で算出し、300m 以内のときだけ登録を許可する。
 */
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { CHECKIN_RADIUS_M, distanceMeters, formatDistance, isWithinCheckinRadius } from "@/lib/geo";
import { devToolsEnabled } from "@/lib/dev-tools";
import { toUserMessage } from "@/lib/errors";
import type { Shrine } from "@/lib/types";
import { usePosition, useTestPosition } from "@/lib/use-position";

export default function CheckInPanel({ shrine }: { shrine: Shrine }) {
  const { checkIn, visits, user } = useApp();
  const { position, loading, error, locate } = usePosition();
  const { setTest } = useTestPosition();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const distance = useMemo(() => {
    if (!position) return null;
    return distanceMeters(
      { latitude: position.latitude, longitude: position.longitude },
      { latitude: shrine.latitude, longitude: shrine.longitude },
    );
  }, [position, shrine.latitude, shrine.longitude]);

  const within =
    position !== null &&
    isWithinCheckinRadius(
      { latitude: position.latitude, longitude: position.longitude },
      { latitude: shrine.latitude, longitude: shrine.longitude },
    );
  const showDevTools = useMemo(() => devToolsEnabled(), []);
  // 位置精度が粗いと 300m 判定がぶれるため、その旨を利用者に伝える
  const coarseAccuracy = position?.accuracy != null && position.accuracy > 150;
  const todayVisits = visits.filter(
    (v) => v.shrine_id === shrine.id && new Date(v.visited_at).toDateString() === new Date().toDateString(),
  );

  const handleCheckIn = async () => {
    if (!position || distance === null) {
      setLocalError("先に現在地を取得してください。");
      return;
    }
    if (!within) {
      setLocalError(
        `神社から約 ${formatDistance(distance)} 離れています。参拝記録の登録は ${CHECKIN_RADIUS_M}m 以内で行えます。`,
      );
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const visit = await checkIn(shrine, {
        latitude: position.latitude,
        longitude: position.longitude,
        distance_m: distance,
      });
      setDone(
        `${new Date(visit.visited_at).toLocaleString("ja-JP")} に参拝記録を登録しました（神社から ${formatDistance(visit.distance_m)}）`,
      );
    } catch (e) {
      setLocalError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="wa-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mincho text-[1.05rem] font-semibold">GPSで参拝記録</h2>
        <span className="chip">半径 {CHECKIN_RADIUS_M}m</span>
      </div>

      <p className="mt-1 text-[0.82rem] leading-snug text-sumi-mute">
        神社に到着したら、現在地を取得して「参拝記録を登録」を押してください。
      </p>

      {!position ? (
        <button className="btn btn-outline mt-3 w-full" onClick={() => void locate()} disabled={loading}>
          {loading ? "現在地を取得しています…" : "現在地を取得する"}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-[10px] border border-washi-line bg-washi-deep/50 px-3 py-2 text-[0.84rem]">
            <p className="text-sumi-mute">{position.label}</p>
            <p className="font-semibold">
              神社までの距離：
              <span className={within ? "text-mori" : "text-shu"}>{formatDistance(distance ?? NaN)}</span>
            </p>
          </div>
          <button className="btn btn-ghost w-full min-h-[42px] text-[0.84rem] underline" onClick={() => void locate()} disabled={loading}>
            現在地を再取得
          </button>
          {coarseAccuracy && (
            <p className="text-[0.78rem] leading-snug text-sumi-mute">
              位置情報の精度が約{Math.round(position.accuracy ?? 0)}mです。判定が安定しない場合は、屋外で「現在地を再取得」をお試しください。
            </p>
          )}
        </div>
      )}

      {(localError || error) && (
        <p className="mt-2 rounded-[10px] border border-shu/30 bg-[#fdf1ef] px-3 py-2 text-[0.84rem] leading-snug text-shu-deep">
          {localError ?? error}
        </p>
      )}

      {done && (
        <p className="mt-2 rounded-[10px] border border-mori/30 bg-[rgba(76,107,79,0.1)] px-3 py-2 text-[0.84rem] leading-snug text-mori">
          ✓ {done}
        </p>
      )}

      <button
        className="btn btn-primary mt-3 w-full"
        onClick={() => void handleCheckIn()}
        disabled={busy || !user || !position}
      >
        {busy ? "登録しています…" : "参拝記録を登録"}
      </button>

      {position && !within && (
        <p className="mt-2 text-center text-[0.78rem] leading-snug text-sumi-mute">
          {CHECKIN_RADIUS_M}m 以内に近づくと登録できます
        </p>
      )}

      {todayVisits.length > 0 && (
        <p className="mt-2 text-center text-[0.78rem] text-mori">
          本日はすでに {todayVisits.length}回 登録済みです
        </p>
      )}

      {/* 動作確認用ヘルパー（Firebase 接続時は既定で非表示） */}
      {showDevTools && (
      <details className="mt-3 rounded-[10px] border border-dashed border-washi-line px-3 py-2">
        <summary className="cursor-pointer text-[0.78rem] font-semibold text-mokume">
          動作確認用：この神社の位置を現在地にする
        </summary>
        <p className="mt-2 text-[0.76rem] leading-snug text-sumi-mute">
          実際に参拝していなくてもチェックインの流れを確認できます。開発・検証専用の機能です。
        </p>
        <button
          className="btn btn-outline mt-2 w-full min-h-[42px] text-[0.84rem]"
          onClick={() => setTest(shrine.latitude, shrine.longitude, `${shrine.name}（テスト位置）`)}
        >
          テスト位置を設定する
        </button>
      </details>
      )}
    </section>
  );
}

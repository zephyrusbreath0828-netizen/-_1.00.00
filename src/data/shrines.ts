/**
 * 神社マスタの読み込み
 *
 * データ本体は **`src/data/shrines.json`（単一ファイル）** に集約しています。
 * - GitHub の Web アップロードは1回100ファイルまでのため、神社ごとにファイルを分けない
 * - 画像は `/images/shrine-1.webp` 〜 `shrine-6.webp` の共通素材を割り当てる
 *   （神社ごとに100枚の画像ファイルを持たない構成）
 *
 * データを更新する場合は `node scripts/gen-shrines.mjs` で再生成してください。
 */
import roster from "./shrines.json";
import type { Shrine } from "@/lib/types";

/** 全100社（全ての都道府県を収録） */
export const SHRINES: Shrine[] = roster as Shrine[];

/**
 * 都道府県の表示順。
 * JSON は北海道→沖縄の順で並んでいるため、初出順をそのまま採用する。
 */
export const PREFECTURES: string[] = Array.from(
  new Set(SHRINES.map((s) => s.prefecture)),
);

export const SHRINE_COUNT = SHRINES.length;

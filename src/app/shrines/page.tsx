"use client";

/** 神社一覧: 都道府県別 / 神社名検索 / 一覧表示 */
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ShrineCard from "@/components/ShrineCard";
import { SHRINES, PREFECTURES } from "@/data/shrines";
import { useApp } from "@/lib/app-context";

type Filter = "all" | "visited" | "unvisited";

export default function ShrinesPage() {
  const { shrines, visitedShrineIds, visitCountOf } = useApp();
  const [q, setQ] = useState("");
  const [prefecture, setPrefecture] = useState("すべて");
  const [filter, setFilter] = useState<Filter>("all");

  // ホーム画面の検索窓からの遷移に対応（?q=伊勢）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    if (initial) setQ(initial);
    const pref = params.get("prefecture");
    if (pref) setPrefecture(pref);
  }, []);

  const prefList = useMemo(() => {
    const used = new Set([...SHRINES, ...shrines].map((s) => s.prefecture));
    return ["すべて", ...PREFECTURES.filter((p) => used.has(p))];
  }, [shrines]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shrines.filter((s) => {
      if (prefecture !== "すべて" && s.prefecture !== prefecture) return false;
      const visited = visitedShrineIds.includes(s.id);
      if (filter === "visited" && !visited) return false;
      if (filter === "unvisited" && visited) return false;
      if (!needle) return true;
      return (
        s.name.toLowerCase().includes(needle) ||
        s.prefecture.toLowerCase().includes(needle) ||
        s.main_deity.toLowerCase().includes(needle) ||
        s.address.toLowerCase().includes(needle)
      );
    });
  }, [shrines, q, prefecture, filter, visitedShrineIds]);

  const grouped = useMemo(() => {
    if (prefecture !== "すべて") return null;
    const map = new Map<string, typeof results>();
    for (const s of results) {
      const list = map.get(s.prefecture) ?? [];
      list.push(s);
      map.set(s.prefecture, list);
    }
    return Array.from(map.entries());
  }, [results, prefecture]);

  return (
    <div>
      <PageHeader
        title="神社をさがす"
        subtitle={`全${shrines.length}社・全都道府県から検索できます`}
      />

      <div className="space-y-3 px-4 py-4">
        <input
          className="field"
          placeholder="神社名・都道府県・祭神で検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="神社を検索"
        />

        <div className="flex gap-2">
          <select
            className="field"
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            aria-label="都道府県で絞り込み"
          >
            {prefList.map((p) => (
              <option key={p} value={p}>
                {p === "すべて" ? "すべての都道府県" : p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "すべて"],
              ["visited", "参拝済み"],
              ["unvisited", "未参拝"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={`chip chip-btn ${filter === key ? "chip-active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
          <span className="chip">該当 {results.length}社</span>
        </div>

        {results.length === 0 && (
          <p className="wa-card p-5 text-center text-[0.9rem] text-sumi-mute">
            条件に合う神社が見つかりませんでした。
          </p>
        )}

        {grouped
          ? grouped.map(([pref, list]) => (
              <section key={pref}>
                <h2 className="mb-2 flex items-center gap-2">
                  <span className="font-mincho text-[1.02rem] font-semibold">{pref}</span>
                  <span className="chip">{list.length}社</span>
                </h2>
                <div className="space-y-2.5">
                  {list.map((s) => (
                    <ShrineCard
                      key={s.id}
                      shrine={s}
                      visited={visitedShrineIds.includes(s.id)}
                      visitCount={visitCountOf(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          : (
            <div className="space-y-2.5">
              {results.map((s) => (
                <ShrineCard
                  key={s.id}
                  shrine={s}
                  visited={visitedShrineIds.includes(s.id)}
                  visitCount={visitCountOf(s.id)}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

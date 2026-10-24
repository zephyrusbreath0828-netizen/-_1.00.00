import Link from "next/link";

/** 未定義のURLにアクセスしたときの案内 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">⛩</span>
      <h1 className="font-mincho text-[1.2rem] font-semibold">ページが見つかりません</h1>
      <p className="text-[0.9rem] leading-relaxed text-sumi-soft">
        お探しのページは移動または削除された可能性があります。
      </p>
      <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2">
        <Link className="btn btn-primary w-full" href="/">
          ホームへ戻る
        </Link>
        <Link className="btn btn-outline w-full" href="/shrines">
          神社をさがす
        </Link>
      </div>
    </div>
  );
}

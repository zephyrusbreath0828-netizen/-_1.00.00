"use client";

/**
 * ルート単位のエラーバウンダリ
 * 描画中の例外を捕捉し、利用者が再試行できる画面を表示する。
 */
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[神旅帳] 画面の描画エラー", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl">⛩</span>
      <h1 className="font-mincho text-[1.2rem] font-semibold">画面を表示できませんでした</h1>
      <p className="text-[0.9rem] leading-relaxed text-sumi-soft">
        一時的なエラーが発生しました。
        <br />
        通信環境をご確認のうえ、もう一度お試しください。
      </p>
      <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2">
        <button className="btn btn-primary w-full" onClick={reset}>
          再読み込みする
        </button>
        <Link className="btn btn-outline w-full" href="/">
          ホームへ戻る
        </Link>
      </div>
      {error.digest && <p className="text-[0.7rem] text-sumi-mute">エラーID: {error.digest}</p>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { allTickers } from "@/lib/stock-data";

export function Nav() {
  const pathname = usePathname();

  const stocks = [
    { ticker: "AAPL", name: "Apple" },
    { ticker: "MSFT", name: "Microsoft" },
    { ticker: "NVDA", name: "NVIDIA" },
    { ticker: "PLTR", name: "Palantir" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              EQ
            </div>
            <span className="text-lg font-bold text-slate-900">EquityLab</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Dashboard
            </Link>
            {stocks.map((s) => (
              <Link
                key={s.ticker}
                href={`/stocks/${s.ticker}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith(`/stocks/${s.ticker}`)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {s.ticker}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Inspired by Anthropic Financial Services
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        <Link
          href="/"
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
            pathname === "/" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
          }`}
        >
          Dashboard
        </Link>
        {stocks.map((s) => (
          <Link
            key={s.ticker}
            href={`/stocks/${s.ticker}`}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
              pathname.startsWith(`/stocks/${s.ticker}`)
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-500"
            }`}
          >
            {s.ticker}
          </Link>
        ))}
      </div>
    </nav>
  );
}

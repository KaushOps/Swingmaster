"use client";

import { Nav } from "@/components/nav";
import { stockDataMap, formatLargeNumber, formatPercent, getRatingColor, allTickers } from "@/lib/stock-data";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

export default function HomePage() {
  const allStockValues = Object.values(stockDataMap);
  const featuredTickers = ["AAPL", "MSFT", "NVDA", "PLTR"];
  const featuredStocks = allStockValues.filter(s => featuredTickers.includes(s.info.ticker));
  
  const [activeTab, setActiveTab] = useState("featured");
  const [usSignals, setUsSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"signals" | "all">("signals");

  const filteredAllStocks = useMemo(() => {
    return allStockValues.filter(s => 
      s.info.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.info.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allStockValues]);

  useEffect(() => {
    if (activeTab === "us" && usSignals.length === 0) {
      setLoading(true);
      fetch("http://localhost:8000/api/us_buys")
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            setUsSignals(data.data);
          }
        })
        .catch(err => console.error("Error fetching US stocks:", err))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-[1440px] px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Equity Research Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Institutional-grade stock analysis inspired by{" "}
              <a
                href="https://github.com/anthropics/financial-services"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                Anthropic&apos;s Financial Services
              </a>{" "}
              repo — adapted for Swingmaster US Markets.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-slate-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("featured")}
              className={`${
                activeTab === "featured"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              Featured Core Analysis
            </button>
            <button
              onClick={() => setActiveTab("us")}
              className={`${
                activeTab === "us"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              Swingmaster US Stocks
            </button>
          </nav>
        </div>

        {activeTab === "featured" ? (
          <>
            {/* Repo Explanation */}
            <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
              <h2 className="text-lg font-semibold text-indigo-900">
                About the Anthropic Financial-Services Repository
              </h2>
              <p className="mt-2 text-sm text-indigo-800 leading-relaxed">
                The <a href="https://github.com/anthropics/financial-services" target="_blank" rel="noopener noreferrer" className="underline font-medium">anthropics/financial-services</a> repo provides reference agents, skills, and data connectors
                for financial services workflows. This tab shows the original static demonstration.
              </p>
            </div>

            {/* Stock Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredStocks.map((s) => {
                const annual = s.financials.filter((f) => f.periodType === "annual");
                const latest = annual[annual.length - 1];
                const prev = annual.length >= 2 ? annual[annual.length - 2] : null;
                const revGrowth = prev ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
                const grossMargin = (latest.grossProfit / latest.revenue) * 100;
                const netMargin = (latest.netIncome / latest.revenue) * 100;

                const latestEarnings = s.earnings.filter((e) => e.epsActual !== null).slice(-1)[0];
                const surprise = latestEarnings?.surprise ?? 0;

                return (
                  <Link
                    key={s.info.ticker}
                    href={`/stocks/${s.info.ticker}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-slate-900">{s.info.ticker}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {s.info.sector}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{s.info.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">${s.info.price.toFixed(2)}</p>
                        <p className={`text-sm font-medium ${s.info.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatPercent(s.info.changePercent)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Market Cap</p>
                        <p className="text-sm font-semibold text-slate-900">{formatLargeNumber(s.info.marketCap)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">P/E Ratio</p>
                        <p className="text-sm font-semibold text-slate-900">{s.info.peRatio.toFixed(1)}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Revenue Growth</p>
                        <p className={`text-sm font-semibold ${revGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatPercent(revGrowth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Gross Margin</p>
                        <p className="text-sm font-semibold text-slate-900">{grossMargin.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Latest EPS Surprise</span>
                        <span className={`font-semibold ${surprise >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {surprise >= 0 ? "+" : ""}{surprise?.toFixed(2) ?? "N/A"}%
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Net Margin</span>
                        <span className="font-semibold text-slate-900">{netMargin.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">
                        View Analysis →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">US Markets Analysis</h2>
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => setViewMode("signals")}
                    className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${viewMode === "signals" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    Live Signals ({usSignals.length})
                  </button>
                  <button 
                    onClick={() => setViewMode("all")}
                    className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${viewMode === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    All US Universe ({allStockValues.length})
                  </button>
                </div>
              </div>
              
              <div className="relative max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-slate-500">Loading US stocks from Swingmaster Backend...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {viewMode === "signals" ? (
                  usSignals.filter(s => 
                    s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((s, idx) => (
                    <div key={`${s.symbol}-${idx}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900">{s.symbol}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${s.action === "STRONG BUY" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                              {s.action}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Entry: ${s.entry?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            {s.confidence?.toFixed(1)}% Conviction
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Target (TP)</p>
                          <p className="text-sm font-semibold text-emerald-600">${s.target?.toFixed(2)}</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Stoploss (SL)</p>
                          <p className="text-sm font-semibold text-red-600">${s.stoploss?.toFixed(2)}</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Hist. Win Rate</p>
                          <p className="text-sm font-semibold text-slate-900">{s.backtest?.win_rate?.toFixed(1)}%</p>
                        </div>
                        <div className="rounded bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">Vol. Spike</p>
                          <p className="text-sm font-semibold text-slate-900">{s.volume_ratio?.toFixed(1)}x</p>
                        </div>
                      </div>

                      {s.rationale && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-700 mb-1">AI Thesis</p>
                          <p className="text-xs text-slate-600 line-clamp-3">{s.rationale}</p>
                        </div>
                      )}

                      <div className="mt-4 text-center">
                        <Link href={`/stocks/${s.symbol}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">
                          View Detailed Analysis →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  filteredAllStocks.slice(0, 100).map((s) => (
                    <Link
                      key={s.info.ticker}
                      href={`/stocks/${s.info.ticker}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900">{s.info.ticker}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {s.info.sector}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{s.info.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">${s.info.price.toFixed(2)}</p>
                          <p className={`text-sm font-medium ${s.info.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatPercent(s.info.changePercent)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Market Cap</p>
                          <p className="text-sm font-semibold text-slate-900">{formatLargeNumber(s.info.marketCap)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">P/E Ratio</p>
                          <p className="text-sm font-semibold text-slate-900">{s.info.peRatio.toFixed(1)}x</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Div. Yield</p>
                          <p className="text-sm font-semibold text-slate-900">{(s.info.dividendYield * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Beta</p>
                          <p className="text-sm font-semibold text-slate-900">{s.info.beta.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-800">
                          View Full Deep Dive →
                        </span>
                      </div>
                    </Link>
                  ))
                )}
                
                {(viewMode === "signals" ? usSignals : filteredAllStocks).length === 0 && !loading && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500">No stocks found matching your criteria.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

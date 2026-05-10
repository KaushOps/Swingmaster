import { Nav } from "@/components/nav";
import { stockDataMap, formatLargeNumber, formatPercent, getRatingColor } from "@/lib/stock-data";
import Link from "next/link";

export default function HomePage() {
  const stocks = Object.values(stockDataMap);

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-[1440px] px-6 py-8">
        {/* Header */}
        <div className="mb-8">
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
            repo — featuring comparable company analysis, DCF valuation, earnings reviews, and investment thesis tracking.
          </p>
        </div>

        {/* Repo Explanation */}
        <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
          <h2 className="text-lg font-semibold text-indigo-900">
            About the Anthropic Financial-Services Repository
          </h2>
          <p className="mt-2 text-sm text-indigo-800 leading-relaxed">
            The <a href="https://github.com/anthropics/financial-services" target="_blank" rel="noopener noreferrer" className="underline font-medium">anthropics/financial-services</a> repo provides reference agents, skills, and data connectors
            for financial services workflows — investment banking, equity research, private equity, and wealth management.
            It includes 10+ specialized agents (Pitch Agent, Market Researcher, Earnings Reviewer, Model Builder, etc.),
            vertical skill bundles for financial analysis (Comps, DCF, LBO, 3-Statement), and MCP integrations with
            11 data providers (Daloopa, Morningstar, S&amp;P Global, FactSet, Moody&apos;s, LSEG, PitchBook, etc.).
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">📊 Comparable Company Analysis</h3>
              <p className="mt-1 text-xs text-slate-600">Trading multiples, operating metrics, and statistical benchmarking vs peers</p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">📈 DCF Valuation</h3>
              <p className="mt-1 text-xs text-slate-600">WACC-based DCF with sensitivity analysis, Bear/Base/Bull scenarios</p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">🔍 Equity Research</h3>
              <p className="mt-1 text-xs text-slate-600">Earnings analysis, investment thesis tracking, and catalyst calendars</p>
            </div>
          </div>
        </div>

        {/* Stock Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stocks.map((s) => {
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

        {/* Quick Comps Table */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Comparable Company Overview</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Ticker</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Company</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Market Cap</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">P/E</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Fwd P/E</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">P/S</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">EV/EBITDA</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Gross Margin</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Rev Growth</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Beta</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const annual = s.financials.filter((f) => f.periodType === "annual");
                  const latest = annual[annual.length - 1];
                  const prev = annual.length >= 2 ? annual[annual.length - 2] : null;
                  const revGrowth = prev ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
                  const grossMargin = (latest.grossProfit / latest.revenue) * 100;

                  return (
                    <tr key={s.info.ticker} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/stocks/${s.info.ticker}`} className="font-bold text-indigo-600 hover:text-indigo-800">
                          {s.info.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.info.name}</td>
                      <td className="px-4 py-3 text-right font-medium">${s.info.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{formatLargeNumber(s.info.marketCap)}</td>
                      <td className="px-4 py-3 text-right">{s.info.peRatio.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-right">{s.info.forwardPE.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-right">{s.info.psRatio.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-right">{s.info.evToEbitda.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-right">{grossMargin.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-right font-medium ${revGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatPercent(revGrowth)}
                      </td>
                      <td className="px-4 py-3 text-right">{s.info.beta.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

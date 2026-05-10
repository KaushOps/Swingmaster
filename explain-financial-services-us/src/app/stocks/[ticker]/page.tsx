import { Nav } from "@/components/nav";
import { getStockData, formatLargeNumber, formatPercent, getRatingColor, getConvictionBadge, getThesisColor, calculateComps, calculateDCF, allTickers } from "@/lib/stock-data";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return allTickers.map((ticker) => ({ ticker }));
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const data = getStockData(ticker);
  if (!data) notFound();

  const { info, financials, earnings, analysts, theses } = data;
  const annual = financials.filter((f) => f.periodType === "annual");
  const latest = annual[annual.length - 1];
  const prev = annual.length >= 2 ? annual[annual.length - 2] : null;
  const revGrowth = prev ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const grossMargin = (latest.grossProfit / latest.revenue) * 100;
  const opMargin = (latest.operatingIncome / latest.revenue) * 100;
  const netMargin = (latest.netIncome / latest.revenue) * 100;
  const fcf = latest.operatingCashFlow - latest.capex;
  const fcfMargin = (fcf / latest.revenue) * 100;

  const comps = calculateComps(allTickers);
  const dcf = calculateDCF(ticker);

  const bullThesis = theses.find((t) => t.type === "bull");
  const baseThesis = theses.find((t) => t.type === "base");
  const bearThesis = theses.find((t) => t.type === "bear");

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-[1440px] px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{info.name}</h1>
              <span className="rounded-lg bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">{info.ticker}</span>
            </div>
            <p className="mt-1 text-slate-500">{info.industry} · {info.sector} · {info.headquarters}</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 leading-relaxed">{info.description}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">${info.price.toFixed(2)}</p>
              <p className={`text-lg font-semibold ${info.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatPercent(info.changePercent)}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-slate-500">Market Cap</span>
              <span className="text-right font-medium">{formatLargeNumber(info.marketCap)}</span>
              <span className="text-slate-500">52W High</span>
              <span className="text-right font-medium">${info.high52Week.toFixed(2)}</span>
              <span className="text-slate-500">52W Low</span>
              <span className="text-right font-medium">${info.low52Week.toFixed(2)}</span>
              <span className="text-slate-500">Avg Volume</span>
              <span className="text-right font-medium">{(info.avgVolume / 1e6).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8 mb-8">
          {[
            { label: "P/E Ratio", value: `${info.peRatio.toFixed(1)}x` },
            { label: "Forward P/E", value: `${info.forwardPE.toFixed(1)}x` },
            { label: "P/S Ratio", value: `${info.psRatio.toFixed(1)}x` },
            { label: "EV/EBITDA", value: `${info.evToEbitda.toFixed(1)}x` },
            { label: "Gross Margin", value: `${grossMargin.toFixed(1)}%` },
            { label: "Op. Margin", value: `${opMargin.toFixed(1)}%` },
            { label: "Rev. Growth", value: formatPercent(revGrowth), color: revGrowth >= 0 ? "text-emerald-600" : "text-red-600" },
            { label: "Beta", value: info.beta.toFixed(2) },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className={`text-lg font-bold ${m.color ?? "text-slate-900"}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Section: Investment Thesis */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Investment Thesis — Bear / Base / Bull</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[bearThesis, baseThesis, bullThesis].filter(Boolean).map((thesis) => {
              if (!thesis) return null;
              const colors = getThesisColor(thesis.type);
              const conviction = getConvictionBadge(thesis.conviction);
              return (
                <div key={thesis.type} className={`rounded-2xl border ${colors.border} ${colors.bg} p-6`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${colors.badge}`}>
                      {thesis.type.toUpperCase()}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conviction.bg} ${conviction.text}`}>
                      {thesis.conviction} conviction
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{thesis.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">{thesis.summary}</p>
                  <div className="mb-3 rounded-lg bg-white/70 p-3">
                    <p className="text-xs font-semibold text-slate-600">Price Target</p>
                    <p className="text-2xl font-bold text-slate-900">${thesis.priceTarget}</p>
                    <p className={`text-sm font-medium ${
                      ((thesis.priceTarget - info.price) / info.price) >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {formatPercent(((thesis.priceTarget - info.price) / info.price) * 100)} vs current
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Key Drivers</p>
                      <ul className="space-y-1">
                        {thesis.keyDrivers.slice(0, 3).map((d, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Key Risks</p>
                      <ul className="space-y-1">
                        {thesis.risks.slice(0, 2).map((r, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Catalysts</p>
                      <ul className="space-y-1">
                        {thesis.catalysts.slice(0, 2).map((c, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: DCF Valuation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">DCF Valuation Model</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Valuation Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Valuation Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">PV of Projected FCFs</span>
                  <span className="text-sm font-semibold">{formatLargeNumber(dcf.pvFCF * 1e6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">PV of Terminal Value</span>
                  <span className="text-sm font-semibold">{formatLargeNumber(dcf.pvTerminal * 1e6)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-slate-900">Enterprise Value</span>
                  <span className="text-sm font-bold">{formatLargeNumber(dcf.enterpriseValue * 1e6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Equity Value</span>
                  <span className="text-sm font-semibold">{formatLargeNumber(dcf.equityValue * 1e6)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-slate-900">Implied Price</span>
                  <span className="text-lg font-bold text-indigo-600">${dcf.impliedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Current Price</span>
                  <span className="text-sm font-semibold">${dcf.currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Upside / Downside</span>
                  <span className={`text-sm font-bold ${dcf.upside >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatPercent(dcf.upside)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-sm text-slate-600">WACC</span>
                  <span className="text-sm font-semibold">{dcf.wacc.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Terminal Growth</span>
                  <span className="text-sm font-semibold">{dcf.terminalGrowth.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Projections */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">5-Year Cash Flow Projections (Base Case)</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3 text-left font-semibold text-slate-700">Metric</th>
                    {dcf.projections.map((p) => (
                      <th key={p.year} className="py-2 px-2 text-right font-semibold text-slate-700">{p.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">Revenue ($M)</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right">{p.revenue.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">Rev Growth</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right text-emerald-600">{p.revenueGrowth.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">EBIT Margin</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right">{p.ebitMargin.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">NOPAT ($M)</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right">{p.nopat.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">Unlevered FCF ($M)</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right font-semibold text-indigo-700">{p.fcf.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">Discount Factor</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right text-slate-500">{p.discountFactor.toFixed(4)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-medium text-slate-900">PV of FCF ($M)</td>
                    {dcf.projections.map((p) => (
                      <td key={p.year} className="py-2 px-2 text-right font-bold text-slate-900">{p.pvFCF.toLocaleString()}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sensitivity Tables */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* WACC vs Terminal Growth */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Sensitivity: WACC vs Terminal Growth → Implied Share Price
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 pr-2 text-left font-semibold text-slate-700">WACC ↓ \ TG →</th>
                    {dcf.sensitivity.waccVsTerminalGrowth[0]?.map((col) => (
                      <th key={col.terminalGrowth} className="py-2 px-2 text-right font-semibold text-slate-700">
                        {(col.terminalGrowth * 100).toFixed(1)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dcf.sensitivity.waccVsTerminalGrowth.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{(row[0].wacc * 100).toFixed(2)}%</td>
                      {row.map((cell, ci) => {
                        const isCenter = ri === 2 && ci === 2;
                        return (
                          <td
                            key={ci}
                            className={`py-2 px-2 text-right font-medium ${
                              isCenter
                                ? "rounded bg-indigo-100 font-bold text-indigo-800"
                                : cell.impliedPrice > dcf.currentPrice
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            ${cell.impliedPrice.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Revenue Growth vs EBIT Margin */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Sensitivity: Revenue Growth vs EBIT Margin → Implied Share Price
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 pr-2 text-left font-semibold text-slate-700">Growth ↓ \ Margin →</th>
                    {dcf.sensitivity.revenueVsMargin[0]?.map((col) => (
                      <th key={col.margin} className="py-2 px-2 text-right font-semibold text-slate-700">
                        {(col.margin * 100).toFixed(0)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dcf.sensitivity.revenueVsMargin.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{(row[0].revenueGrowth * 100).toFixed(0)}%</td>
                      {row.map((cell, ci) => {
                        const isCenter = ri === 2 && ci === 2;
                        return (
                          <td
                            key={ci}
                            className={`py-2 px-2 text-right font-medium ${
                              isCenter
                                ? "rounded bg-indigo-100 font-bold text-indigo-800"
                                : cell.impliedPrice > dcf.currentPrice
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            ${cell.impliedPrice.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section: Comps */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Comparable Company Analysis</h2>
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
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Gross Mrgn</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Op Mrgn</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Rev Grwth</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">FCF Yield</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Div Yield</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr
                    key={c.ticker}
                    className={`border-b border-slate-100 transition-colors ${
                      c.ticker === ticker ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/stocks/${c.ticker}`} className="font-bold text-indigo-600 hover:text-indigo-800">
                        {c.ticker}
                      </Link>
                      {c.ticker === ticker && (
                        <span className="ml-2 text-xs text-indigo-500">●</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.name}</td>
                    <td className="px-4 py-3 text-right font-medium">${c.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{formatLargeNumber(c.marketCap)}</td>
                    <td className="px-4 py-3 text-right">{c.peRatio.toFixed(1)}x</td>
                    <td className="px-4 py-3 text-right">{c.forwardPE.toFixed(1)}x</td>
                    <td className="px-4 py-3 text-right">{c.psRatio.toFixed(1)}x</td>
                    <td className="px-4 py-3 text-right">{c.evToEbitda.toFixed(1)}x</td>
                    <td className="px-4 py-3 text-right">{c.grossMargin.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">{c.operatingMargin.toFixed(1)}%</td>
                    <td className={`px-4 py-3 text-right font-medium ${c.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatPercent(c.revenueGrowth)}
                    </td>
                    <td className="px-4 py-3 text-right">{c.fcfYield.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right">{(c.dividendYield * 100).toFixed(2)}%</td>
                  </tr>
                ))}
                {/* Averages */}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>Mean</td>
                  <td className="px-4 py-3 text-right">{formatLargeNumber(comps.reduce((a, c) => a + c.marketCap, 0) / comps.length)}</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.peRatio, 0) / comps.length).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.forwardPE, 0) / comps.length).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.psRatio, 0) / comps.length).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.evToEbitda, 0) / comps.length).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.grossMargin, 0) / comps.length).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.operatingMargin, 0) / comps.length).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.revenueGrowth, 0) / comps.length).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.fcfYield, 0) / comps.length).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.reduce((a, c) => a + c.dividendYield, 0) / comps.length * 100).toFixed(2)}%</td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3" colSpan={3}>Median</td>
                  <td className="px-4 py-3 text-right">{formatLargeNumber([...comps].sort((a, b) => a.marketCap - b.marketCap)[Math.floor(comps.length / 2)].marketCap)}</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.peRatio).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.forwardPE).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.psRatio).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.evToEbitda).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}x</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.grossMargin).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.operatingMargin).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.revenueGrowth).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.fcfYield).sort((a, b) => a - b)[Math.floor(comps.length / 2)]).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">{(comps.map(c => c.dividendYield).sort((a, b) => a - b)[Math.floor(comps.length / 2)] * 100).toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Historical Financials */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Historical Financials</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Metric</th>
                  {annual.map((f) => (
                    <th key={f.period} className="px-4 py-3 text-right font-semibold text-slate-700">{f.period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Revenue ($M", values: annual.map((f) => f.revenue) },
                  { label: "Gross Profit ($M)", values: annual.map((f) => f.grossProfit) },
                  { label: "Operating Income ($M)", values: annual.map((f) => f.operatingIncome) },
                  { label: "Net Income ($M)", values: annual.map((f) => f.netIncome) },
                  { label: "EBITDA ($M)", values: annual.map((f) => f.ebitda) },
                  { label: "EPS", values: annual.map((f) => f.eps) },
                  { label: "Operating Cash Flow ($M)", values: annual.map((f) => f.operatingCashFlow) },
                  { label: "CapEx ($M)", values: annual.map((f) => f.capex) },
                  { label: "Free Cash Flow ($M)", values: annual.map((f) => f.operatingCashFlow - f.capex) },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-2 text-right">
                        {typeof v === "number" && v >= 1000
                          ? Math.round(v).toLocaleString()
                          : typeof v === "number"
                          ? v.toFixed(2)
                          : v}
                      </td>
                    ))}
                  </tr>
                ))}
                {[
                  { label: "Gross Margin", values: annual.map((f) => ((f.grossProfit / f.revenue) * 100).toFixed(1) + "%") },
                  { label: "Operating Margin", values: annual.map((f) => ((f.operatingIncome / f.revenue) * 100).toFixed(1) + "%") },
                  { label: "Net Margin", values: annual.map((f) => ((f.netIncome / f.revenue) * 100).toFixed(1) + "%") },
                  { label: "FCF Margin", values: annual.map((f) => (((f.operatingCashFlow - f.capex) / f.revenue) * 100).toFixed(1) + "%") },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-2 text-right font-medium text-slate-700">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Earnings */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Earnings Estimates & Results</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Period</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Report Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">EPS Est.</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">EPS Actual</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Surprise</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Rev Est. ($M)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Rev Actual ($M)</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => {
                  const hasReported = e.epsActual !== null;
                  return (
                    <tr key={e.period} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{e.period}</td>
                      <td className="px-4 py-3 text-slate-600">{e.reportDate}</td>
                      <td className="px-4 py-3 text-right">${e.epsEstimate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {hasReported ? `$${e.epsActual!.toFixed(2)}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        !hasReported ? "text-slate-400" :
                        (e.surprise ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {hasReported ? `${(e.surprise ?? 0) >= 0 ? "+" : ""}${(e.surprise ?? 0).toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{Math.round(e.revenueEstimate).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {e.revenueActual ? Math.round(e.revenueActual).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasReported ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            (e.surprise ?? 0) >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {(e.surprise ?? 0) >= 0 ? "Beat" : "Miss"}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Analyst Ratings */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Analyst Ratings</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analysts.map((a) => (
              <div key={a.firm} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{a.firm}</p>
                    <p className="text-xs text-slate-500">{a.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${getRatingColor(a.rating)}`}>{a.rating}</span>
                </div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-slate-600">Price Target</span>
                  <span className="font-bold text-slate-900">${a.priceTarget}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{a.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Company Info */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Company Profile</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "CEO", value: info.ceo },
                { label: "Headquarters", value: info.headquarters },
                { label: "Employees", value: info.employees.toLocaleString() },
                { label: "Founded", value: info.founded.toString() },
                { label: "Sector", value: info.sector },
                { label: "Industry", value: info.industry },
                { label: "Website", value: info.website },
                { label: "Dividend Yield", value: `${(info.dividendYield * 100).toFixed(2)}%` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-6 pb-12 text-center text-xs text-slate-500">
          <p>
            Analysis inspired by{" "}
            <a href="https://github.com/anthropics/financial-services" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
              Anthropic Financial Services
            </a>{" "}
            repo methodologies (Comps, DCF, Earnings Analysis, Thesis Tracking).
          </p>
          <p className="mt-1">
            ⚠️ This is a demonstration tool using simulated data. Nothing here constitutes investment advice. Always verify with qualified professionals.
          </p>
        </footer>
      </div>
    </>
  );
}

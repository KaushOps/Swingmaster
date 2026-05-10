import allStocksData from '../assets/us-research-data.json';

export const stockDataMap = allStocksData;

export const allTickers = Object.keys(allStocksData);

export function getStockData(ticker) {
  return allStocksData[ticker.toUpperCase()] || null;
}

export function formatLargeNumber(n) {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function formatPercent(n) {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function getRatingColor(rating) {
  const r = (rating || '').toLowerCase();
  if (r === 'buy' || r === 'strong buy' || r === 'outperform' || r === 'overweight') return '#10b981';
  if (r === 'sell' || r === 'underperform' || r === 'underweight') return '#ef4444';
  return '#f59e0b';
}

export function getConvictionBadge(conviction) {
  if (conviction === 'high')   return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'High' };
  if (conviction === 'low')    return { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Low' };
  return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Medium' };
}

export function getThesisColor(type) {
  if (type === 'bull') return '#10b981';
  if (type === 'bear') return '#ef4444';
  return '#f59e0b';
}

export function calculateDCF(ticker) {
  const data = getStockData(ticker);
  if (!data) return null;
  const annual = (data.financials || []).filter(f => f.periodType === 'annual');
  if (annual.length < 2) return null;
  const latest = annual[annual.length - 1];
  const prev   = annual[annual.length - 2];
  const fcf = latest.operatingCashFlow - latest.capex;
  const revGrowth = prev.revenue > 0 ? (latest.revenue - prev.revenue) / prev.revenue : 0.1;
  const growthRate = Math.min(Math.max(revGrowth, 0.03), 0.35);
  const terminalGrowth = 0.03;
  const wacc = 0.09;
  let projectedFCF = fcf;
  let totalPV = 0;
  for (let yr = 1; yr <= 5; yr++) {
    projectedFCF *= (1 + growthRate * (1 - (yr - 1) * 0.05));
    totalPV += projectedFCF / Math.pow(1 + wacc, yr);
  }
  const terminalValue = (projectedFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const terminalPV = terminalValue / Math.pow(1 + wacc, 5);
  const totalEquityValue = totalPV + terminalPV;
  const shares = latest.sharesOutstanding || 1e9;
  const fairValue = totalEquityValue / shares;
  const upside = data.info.price > 0 ? ((fairValue - data.info.price) / data.info.price) * 100 : 0;
  return {
    fairValue: Math.max(fairValue, 0),
    upside,
    growthRate: growthRate * 100,
    wacc: wacc * 100,
    fcf,
  };
}

export function calculateComps(tickers) {
  return tickers
    .map(t => {
      const d = getStockData(t);
      if (!d) return null;
      return {
        ticker: t,
        name: d.info.name,
        sector: d.info.sector,
        peRatio: d.info.peRatio,
        psRatio: d.info.psRatio,
        pbRatio: d.info.pbRatio,
        evToEbitda: d.info.evToEbitda,
        marketCap: d.info.marketCap,
      };
    })
    .filter(Boolean);
}

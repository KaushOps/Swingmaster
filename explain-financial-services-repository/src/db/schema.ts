import { pgTable, text, numeric, timestamp, varchar, integer, jsonb } from "drizzle-orm/pg-core";

export const stocks = pgTable("stocks", {
  ticker: varchar({ length: 10 }).primaryKey(),
  name: text().notNull(),
  sector: text().notNull(),
  industry: text().notNull(),
  description: text().notNull(),
  ceo: text().notNull(),
  headquarters: text().notNull(),
  employees: integer().notNull(),
  founded: integer().notNull(),
  website: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockFinancials = pgTable("stock_financials", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ticker: varchar({ length: 10 }).notNull().references(() => stocks.ticker),
  period: text().notNull(), // e.g. "FY2024", "Q1-2024"
  periodType: text().notNull(), // "annual" or "quarterly"
  revenue: numeric({ precision: 18, scale: 2 }).notNull(),
  grossProfit: numeric({ precision: 18, scale: 2 }),
  operatingIncome: numeric({ precision: 18, scale: 2 }),
  netIncome: numeric({ precision: 18, scale: 2 }),
  ebitda: numeric({ precision: 18, scale: 2 }),
  totalAssets: numeric({ precision: 18, scale: 2 }),
  totalDebt: numeric({ precision: 18, scale: 2 }),
  cashAndEquivalents: numeric({ precision: 18, scale: 2 }),
  sharesOutstanding: numeric({ precision: 18, scale: 2 }),
  eps: numeric({ precision: 10, scale: 4 }),
  dividendsPerShare: numeric({ precision: 10, scale: 4 }),
  capex: numeric({ precision: 18, scale: 2 }),
  operatingCashFlow: numeric({ precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockPrices = pgTable("stock_prices", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ticker: varchar({ length: 10 }).notNull().references(() => stocks.ticker),
  price: numeric({ precision: 12, scale: 2 }).notNull(),
  changePercent: numeric({ precision: 8, scale: 4 }),
  marketCap: numeric({ precision: 18, scale: 2 }),
  peRatio: numeric({ precision: 10, scale: 2 }),
  forwardPE: numeric({ precision: 10, scale: 2 }),
  psRatio: numeric({ precision: 10, scale: 2 }),
  pbRatio: numeric({ precision: 10, scale: 2 }),
  evToEbitda: numeric({ precision: 10, scale: 2 }),
  dividendYield: numeric({ precision: 8, scale: 4 }),
  beta: numeric({ precision: 8, scale: 4 }),
  high52Week: numeric({ precision: 12, scale: 2 }),
  low52Week: numeric({ precision: 12, scale: 2 }),
  avgVolume: numeric({ precision: 18, scale: 0 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analystRatings = pgTable("analyst_ratings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ticker: varchar({ length: 10 }).notNull().references(() => stocks.ticker),
  firm: text().notNull(),
  rating: text().notNull(), // "Buy", "Hold", "Sell"
  priceTarget: numeric({ precision: 12, scale: 2 }),
  date: text().notNull(),
  summary: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const earningsEstimates = pgTable("earnings_estimates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ticker: varchar({ length: 10 }).notNull().references(() => stocks.ticker),
  period: text().notNull(),
  epsEstimate: numeric({ precision: 10, scale: 4 }).notNull(),
  epsActual: numeric({ precision: 10, scale: 4 }),
  revenueEstimate: numeric({ precision: 18, scale: 2 }).notNull(),
  revenueActual: numeric({ precision: 18, scale: 2 }),
  surprise: numeric({ precision: 10, scale: 4 }),
  reportDate: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investmentTheses = pgTable("investment_theses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ticker: varchar({ length: 10 }).notNull().references(() => stocks.ticker),
  title: text().notNull(),
  thesisType: text().notNull(), // "bull", "bear", "base"
  summary: text().notNull(),
  priceTarget: numeric({ precision: 12, scale: 2 }),
  keyDrivers: jsonb().notNull(),
  risks: jsonb(),
  catalysts: jsonb(),
  convictionLevel: text().notNull(), // "high", "medium", "low"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

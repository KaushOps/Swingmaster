(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/nav.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Nav",
    ()=>Nav
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function Nav() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const stocks = [
        {
            ticker: "AAPL",
            name: "Apple"
        },
        {
            ticker: "MSFT",
            name: "Microsoft"
        },
        {
            ticker: "NVDA",
            name: "NVIDIA"
        },
        {
            ticker: "PLTR",
            name: "Palantir"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white",
                                        children: "EQ"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/nav.tsx",
                                        lineNumber: 22,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-lg font-bold text-slate-900",
                                        children: "EquityLab"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/nav.tsx",
                                        lineNumber: 25,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/nav.tsx",
                                lineNumber: 21,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hidden items-center gap-1 md:flex",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/",
                                        className: `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === "/" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`,
                                        children: "Dashboard"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/nav.tsx",
                                        lineNumber: 29,
                                        columnNumber: 13
                                    }, this),
                                    stocks.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: `/stocks/${s.ticker}`,
                                            className: `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith(`/stocks/${s.ticker}`) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`,
                                            children: s.ticker
                                        }, s.ticker, false, {
                                            fileName: "[project]/src/components/nav.tsx",
                                            lineNumber: 40,
                                            columnNumber: 15
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/nav.tsx",
                                lineNumber: 28,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/nav.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 sm:flex",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "h-2 w-2 rounded-full bg-emerald-400"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/nav.tsx",
                                    lineNumber: 57,
                                    columnNumber: 13
                                }, this),
                                "Inspired by Anthropic Financial Services"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/nav.tsx",
                            lineNumber: 56,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/nav.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/nav.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: `shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${pathname === "/" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`,
                        children: "Dashboard"
                    }, void 0, false, {
                        fileName: "[project]/src/components/nav.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, this),
                    stocks.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: `/stocks/${s.ticker}`,
                            className: `shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${pathname.startsWith(`/stocks/${s.ticker}`) ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`,
                            children: s.ticker
                        }, s.ticker, false, {
                            fileName: "[project]/src/components/nav.tsx",
                            lineNumber: 74,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/nav.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/nav.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_s(Nav, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = Nav;
var _c;
__turbopack_context__.k.register(_c, "Nav");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/stock-data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Comprehensive stock data library with realistic financial data
// Inspired by Anthropic's financial-services repo methodologies
__turbopack_context__.s([
    "allTickers",
    ()=>allTickers,
    "calculateComps",
    ()=>calculateComps,
    "calculateDCF",
    ()=>calculateDCF,
    "formatLargeNumber",
    ()=>formatLargeNumber,
    "formatPercent",
    ()=>formatPercent,
    "formatPrice",
    ()=>formatPrice,
    "getConvictionBadge",
    ()=>getConvictionBadge,
    "getRatingColor",
    ()=>getRatingColor,
    "getStockData",
    ()=>getStockData,
    "getThesisColor",
    ()=>getThesisColor,
    "stockDataMap",
    ()=>stockDataMap
]);
// ===================== AAPL =====================
const aaplData = {
    info: {
        ticker: "AAPL",
        name: "Apple Inc.",
        sector: "Technology",
        industry: "Consumer Electronics",
        description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, Mac, iPad, and wearables, home, and accessories. It also provides advertising services, AppleCare support, cloud, digital content, payment, and licensing services. Apple was founded in 1976 and is headquartered in Cupertino, California.",
        ceo: "Tim Cook",
        headquarters: "Cupertino, California",
        employees: 164000,
        founded: 1976,
        website: "apple.com",
        price: 213.25,
        changePercent: 1.24,
        marketCap: 3250000000000,
        peRatio: 33.8,
        forwardPE: 29.5,
        psRatio: 8.4,
        pbRatio: 49.2,
        evToEbitda: 25.1,
        dividendYield: 0.005,
        beta: 1.22,
        high52Week: 237.49,
        low52Week: 164.08,
        avgVolume: 58400000
    },
    financials: [
        {
            period: "FY2020",
            periodType: "annual",
            revenue: 274515,
            grossProfit: 104956,
            operatingIncome: 66288,
            netIncome: 57411,
            ebitda: 80934,
            totalAssets: 323888,
            totalDebt: 112436,
            cashAndEquivalents: 90943,
            sharesOutstanding: 17001,
            eps: 3.28,
            dividendsPerShare: 0.82,
            capex: 7309,
            operatingCashFlow: 80674
        },
        {
            period: "FY2021",
            periodType: "annual",
            revenue: 365817,
            grossProfit: 152836,
            operatingIncome: 108949,
            netIncome: 94680,
            ebitda: 123443,
            totalAssets: 351002,
            totalDebt: 120329,
            cashAndEquivalents: 62639,
            sharesOutstanding: 16702,
            eps: 5.67,
            dividendsPerShare: 0.88,
            capex: 9328,
            operatingCashFlow: 104038
        },
        {
            period: "FY2022",
            periodType: "annual",
            revenue: 394328,
            grossProfit: 170782,
            operatingIncome: 119437,
            netIncome: 99803,
            ebitda: 133138,
            totalAssets: 352755,
            totalDebt: 120069,
            cashAndEquivalents: 48304,
            sharesOutstanding: 16264,
            eps: 6.15,
            dividendsPerShare: 0.92,
            capex: 10353,
            operatingCashFlow: 122151
        },
        {
            period: "FY2023",
            periodType: "annual",
            revenue: 383285,
            grossProfit: 169148,
            operatingIncome: 114301,
            netIncome: 97036,
            ebitda: 125820,
            totalAssets: 352583,
            totalDebt: 111088,
            cashAndEquivalents: 29965,
            sharesOutstanding: 15813,
            eps: 6.13,
            dividendsPerShare: 0.96,
            capex: 10484,
            operatingCashFlow: 110543
        },
        {
            period: "FY2024",
            periodType: "annual",
            revenue: 391035,
            grossProfit: 180683,
            operatingIncome: 117257,
            netIncome: 93756,
            ebitda: 134661,
            totalAssets: 364980,
            totalDebt: 99970,
            cashAndEquivalents: 29943,
            sharesOutstanding: 15116,
            eps: 6.11,
            dividendsPerShare: 1.00,
            capex: 10696,
            operatingCashFlow: 118254
        }
    ],
    earnings: [
        {
            period: "Q1 FY2024",
            epsEstimate: 2.10,
            epsActual: 2.18,
            revenueEstimate: 117900,
            revenueActual: 119575,
            surprise: 3.81,
            reportDate: "2024-01-25"
        },
        {
            period: "Q2 FY2024",
            epsEstimate: 1.50,
            epsActual: 1.53,
            revenueEstimate: 90000,
            revenueActual: 90753,
            surprise: 2.0,
            reportDate: "2024-05-02"
        },
        {
            period: "Q3 FY2024",
            epsEstimate: 1.34,
            epsActual: 1.40,
            revenueEstimate: 84400,
            revenueActual: 85800,
            surprise: 4.48,
            reportDate: "2024-08-01"
        },
        {
            period: "Q4 FY2024",
            epsEstimate: 1.59,
            epsActual: 1.64,
            revenueEstimate: 94200,
            revenueActual: 94906,
            surprise: 3.14,
            reportDate: "2024-10-31"
        },
        {
            period: "Q1 FY2025",
            epsEstimate: 2.35,
            epsActual: null,
            revenueEstimate: 124500,
            revenueActual: null,
            surprise: null,
            reportDate: "2025-01-30"
        }
    ],
    analysts: [
        {
            firm: "Morgan Stanley",
            rating: "Overweight",
            priceTarget: 240,
            date: "2025-01-15",
            summary: "Apple Intelligence cycle driving upgrade supercycle. Services revenue accelerating with strong App Store growth."
        },
        {
            firm: "Goldman Sachs",
            rating: "Buy",
            priceTarget: 235,
            date: "2025-01-10",
            summary: "Strong iPhone 16 cycle with AI features. Services margin expansion continues."
        },
        {
            firm: "JPMorgan",
            rating: "Overweight",
            priceTarget: 245,
            date: "2025-01-08",
            summary: "AI integration across product lineup is a game changer. Expecting strong FY25 guidance."
        },
        {
            firm: "Bank of America",
            rating: "Buy",
            priceTarget: 230,
            date: "2024-12-18",
            summary: "Services growth trajectory remains compelling. Vision Pro ecosystem expanding."
        },
        {
            firm: "Barclays",
            rating: "Equal Weight",
            priceTarget: 200,
            date: "2024-12-12",
            summary: "Valuation stretched at current levels. iPhone growth may slow in mature markets."
        }
    ],
    theses: [
        {
            type: "bull",
            title: "Apple Intelligence Drives a Multi-Year Supercycle",
            summary: "Apple's integration of on-device AI (Apple Intelligence) across iPhone, Mac, and iPad creates a compelling upgrade cycle. Combined with accelerating Services revenue (App Store, Apple TV+, iCloud) and expanding margins, AAPL is positioned for sustained growth.",
            priceTarget: 250,
            keyDrivers: [
                "Apple Intelligence AI integration driving iPhone upgrades",
                "Services revenue growing 15%+ YoY with 70%+ margins",
                "Installed base expansion to 2.2B+ active devices",
                "Vision Pro creating new product category"
            ],
            risks: [
                "Regulatory pressure on App Store commissions (EU DMA)",
                "Geopolitical risk in China manufacturing",
                "Consumer spending slowdown in premium segment"
            ],
            catalysts: [
                "Q1 FY2025 earnings (iPhone 16 cycle)",
                "Apple Intelligence feature expansion WWDC 2025",
                "New budget iPhone launch for emerging markets"
            ],
            conviction: "high"
        },
        {
            type: "base",
            title: "Steady Growth Through Services Expansion",
            summary: "Apple continues to grow revenue at mid-single digits, driven primarily by Services. Hardware growth moderates but margins improve as mix shifts. Fair value based on DCF at current growth trajectory.",
            priceTarget: 215,
            keyDrivers: [
                "Services revenue growing 12% CAGR",
                "Modest iPhone unit growth with ASP increases",
                "Margin expansion from Services mix shift",
                "Share buybacks reducing share count 3-4% annually"
            ],
            risks: [
                "iPhone replacement cycle lengthening",
                "China competitive pressure from Huawei/Xiaomi",
                "App Store regulatory headwinds"
            ],
            catalysts: [
                "Quarterly earnings and guidance",
                "New product launches",
                "Capital allocation updates"
            ],
            conviction: "medium"
        },
        {
            type: "bear",
            title: "Peak Margins and Regulatory Headwinds",
            summary: "Apple faces peak margins with limited room for expansion. Regulatory pressure on App Store, potential tariffs on China manufacturing, and slowing innovation create downside risk.",
            priceTarget: 175,
            keyDrivers: [
                "App Store commission pressure from regulators",
                "China manufacturing risk and potential tariffs",
                "Consumer upgrade fatigue in mature smartphone market"
            ],
            risks: [
                "Antitrust actions forcing business model changes",
                "AI competition from Google/Samsung",
                "Hardware revenue decline in key markets"
            ],
            catalysts: [
                "EU DMA enforcement actions",
                "China-US trade tensions escalation",
                "Competitive AI product launches from rivals"
            ],
            conviction: "low"
        }
    ]
};
// ===================== MSFT =====================
const msftData = {
    info: {
        ticker: "MSFT",
        name: "Microsoft Corporation",
        sector: "Technology",
        industry: "Software—Infrastructure",
        description: "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide. The company operates through Productivity and Business Processes, Intelligent Cloud, and More Personal Computing segments. Microsoft is a leader in cloud computing (Azure), enterprise software (Office 365), and AI (OpenAI partnership).",
        ceo: "Satya Nadella",
        headquarters: "Redmond, Washington",
        employees: 228000,
        founded: 1975,
        website: "microsoft.com",
        price: 433.50,
        changePercent: 0.87,
        marketCap: 3220000000000,
        peRatio: 36.5,
        forwardPE: 32.1,
        psRatio: 13.2,
        pbRatio: 12.8,
        evToEbitda: 26.3,
        dividendYield: 0.007,
        beta: 0.89,
        high52Week: 468.35,
        low52Week: 362.90,
        avgVolume: 22100000
    },
    financials: [
        {
            period: "FY2021",
            periodType: "annual",
            revenue: 168088,
            grossProfit: 115856,
            operatingIncome: 69762,
            netIncome: 61271,
            ebitda: 79824,
            totalAssets: 333779,
            totalDebt: 67597,
            cashAndEquivalents: 130331,
            sharesOutstanding: 7510,
            eps: 8.05,
            dividendsPerShare: 2.24,
            capex: 20780,
            operatingCashFlow: 76740
        },
        {
            period: "FY2022",
            periodType: "annual",
            revenue: 198270,
            grossProfit: 135602,
            operatingIncome: 83524,
            netIncome: 72738,
            ebitda: 93945,
            totalAssets: 364840,
            totalDebt: 49463,
            cashAndEquivalents: 104633,
            sharesOutstanding: 7450,
            eps: 9.70,
            dividendsPerShare: 2.42,
            capex: 23888,
            operatingCashFlow: 89036
        },
        {
            period: "FY2023",
            periodType: "annual",
            revenue: 211915,
            grossProfit: 146052,
            operatingIncome: 90119,
            netIncome: 73364,
            ebitda: 101078,
            totalAssets: 411976,
            totalDebt: 47612,
            cashAndEquivalents: 111262,
            sharesOutstanding: 7430,
            eps: 9.68,
            dividendsPerShare: 2.72,
            capex: 28108,
            operatingCashFlow: 87582
        },
        {
            period: "FY2024",
            periodType: "annual",
            revenue: 245122,
            grossProfit: 171492,
            operatingIncome: 109433,
            netIncome: 88136,
            ebitda: 120960,
            totalAssets: 512183,
            totalDebt: 42760,
            cashAndEquivalents: 76494,
            sharesOutstanding: 7432,
            eps: 11.80,
            dividendsPerShare: 3.00,
            capex: 44477,
            operatingCashFlow: 118548
        }
    ],
    earnings: [
        {
            period: "Q1 FY2025",
            epsEstimate: 3.10,
            epsActual: 3.30,
            revenueEstimate: 64500,
            revenueActual: 65600,
            surprise: 6.45,
            reportDate: "2024-10-22"
        },
        {
            period: "Q2 FY2025",
            epsEstimate: 3.11,
            epsActual: 3.32,
            revenueEstimate: 68700,
            revenueActual: 69630,
            surprise: 6.75,
            reportDate: "2025-01-29"
        },
        {
            period: "Q3 FY2025",
            epsEstimate: 3.22,
            epsActual: null,
            revenueEstimate: 68200,
            revenueActual: null,
            surprise: null,
            reportDate: "2025-04-29"
        },
        {
            period: "Q4 FY2025",
            epsEstimate: 3.45,
            epsActual: null,
            revenueEstimate: 73800,
            revenueActual: null,
            surprise: null,
            reportDate: "2025-07-29"
        }
    ],
    analysts: [
        {
            firm: "Goldman Sachs",
            rating: "Buy",
            priceTarget: 500,
            date: "2025-01-20",
            summary: "Azure AI workloads accelerating. Copilot monetization inflection point."
        },
        {
            firm: "Morgan Stanley",
            rating: "Overweight",
            priceTarget: 480,
            date: "2025-01-15",
            summary: "Cloud AI infrastructure leader. GitHub Copilot driving developer productivity."
        },
        {
            firm: "UBS",
            rating: "Buy",
            priceTarget: 475,
            date: "2025-01-12",
            summary: "Azure growth re-accelerating. Enterprise AI adoption driving cloud spend."
        },
        {
            firm: "Wells Fargo",
            rating: "Overweight",
            priceTarget: 465,
            date: "2025-01-08",
            summary: "Microsoft 365 Copilot could be the next Office franchise."
        },
        {
            firm: "Jefferies",
            rating: "Buy",
            priceTarget: 490,
            date: "2024-12-20",
            summary: "Best positioned for AI monetization across cloud, productivity, and gaming."
        }
    ],
    theses: [
        {
            type: "bull",
            title: "AI Monetization Across the Stack",
            summary: "Microsoft is uniquely positioned to monetize AI across every layer: infrastructure (Azure AI), platform (Copilot stack), and applications (M365 Copilot, GitHub Copilot). The OpenAI partnership gives them a durable competitive advantage in enterprise AI.",
            priceTarget: 500,
            keyDrivers: [
                "Azure AI revenue growing 50%+ YoY",
                "M365 Copilot adoption reaching 30% of enterprise seats",
                "GitHub Copilot monetization accelerating",
                "Gaming revenue growth from Activision integration"
            ],
            risks: [
                "OpenAI partnership dynamics could shift",
                "AI infrastructure capex weighing on margins short-term",
                "Regulatory scrutiny of AI market position"
            ],
            catalysts: [
                "Azure AI revenue disclosure",
                "M365 Copilot pricing and adoption metrics",
                "FY2025 Q3/Q4 guidance"
            ],
            conviction: "high"
        },
        {
            type: "base",
            title: "Cloud Growth with AI Premium",
            summary: "Microsoft continues to grow Azure at 25-30% with AI premium. Enterprise adoption of Copilot products provides incremental revenue. Steady growth with improving margins as cloud scale benefits kick in.",
            priceTarget: 440,
            keyDrivers: [
                "Azure growing 28% CAGR",
                "M365 Copilot as incremental ARPU uplift",
                "Operating margin expansion to 50%+",
                "Share buybacks and dividend growth"
            ],
            risks: [
                "Enterprise AI spending could slow",
                "Competition from AWS and GCP",
                "Capex intensity of AI infrastructure"
            ],
            catalysts: [
                "Quarterly Azure growth rates",
                "Copilot adoption metrics",
                "Margin trajectory"
            ],
            conviction: "medium"
        },
        {
            type: "bear",
            title: "AI Capex Cycle Overshoot",
            summary: "Massive AI infrastructure spending ($50B+ annually) may not generate proportional returns. Enterprise AI adoption slower than expected. Cloud growth deceleration risk as optimizations continue.",
            priceTarget: 370,
            keyDrivers: [
                "AI infrastructure capex consuming cash flow",
                "Enterprise AI adoption slower than hype",
                "Cloud optimization headwinds persisting"
            ],
            risks: [
                "AI bubble risk if ROI doesn't materialize",
                "OpenAI building competing products",
                "Antitrust concerns in cloud market"
            ],
            catalysts: [
                "Azure growth deceleration",
                "AI capex vs revenue metrics",
                "Enterprise IT spending cuts"
            ],
            conviction: "medium"
        }
    ]
};
// ===================== NVDA =====================
const nvdaData = {
    info: {
        ticker: "NVDA",
        name: "NVIDIA Corporation",
        sector: "Technology",
        industry: "Semiconductors",
        description: "NVIDIA Corporation provides graphics, compute, and networking solutions. The company operates through Graphics Processing Unit (GPU) and Tegra Processor segments. It serves gaming, professional visualization, datacenter, and automotive markets. NVIDIA has become the dominant supplier of AI training and inference chips.",
        ceo: "Jensen Huang",
        headquarters: "Santa Clara, California",
        employees: 29600,
        founded: 1993,
        website: "nvidia.com",
        price: 138.25,
        changePercent: 2.15,
        marketCap: 3400000000000,
        peRatio: 53.2,
        forwardPE: 38.7,
        psRatio: 27.8,
        pbRatio: 58.4,
        evToEbitda: 42.1,
        dividendYield: 0.003,
        beta: 1.68,
        high52Week: 153.13,
        low52Week: 47.32,
        avgVolume: 312000000
    },
    financials: [
        {
            period: "FY2022",
            periodType: "annual",
            revenue: 26914,
            grossProfit: 17307,
            operatingIncome: 9159,
            netIncome: 9746,
            ebitda: 10195,
            totalAssets: 44127,
            totalDebt: 10968,
            cashAndEquivalents: 21015,
            sharesOutstanding: 2500,
            eps: 3.85,
            dividendsPerShare: 0.16,
            capex: 1011,
            operatingCashFlow: 9567
        },
        {
            period: "FY2023",
            periodType: "annual",
            revenue: 26974,
            grossProfit: 15121,
            operatingIncome: 5077,
            netIncome: 4368,
            ebitda: 6234,
            totalAssets: 65828,
            totalDebt: 9832,
            cashAndEquivalents: 15680,
            sharesOutstanding: 2460,
            eps: 1.74,
            dividendsPerShare: 0.16,
            capex: 3642,
            operatingCashFlow: 5716
        },
        {
            period: "FY2024",
            periodType: "annual",
            revenue: 60922,
            grossProfit: 42840,
            operatingIncome: 32958,
            netIncome: 29760,
            ebitda: 35518,
            totalAssets: 85197,
            totalDebt: 8529,
            cashAndEquivalents: 25940,
            sharesOutstanding: 2450,
            eps: 11.93,
            dividendsPerShare: 0.16,
            capex: 3584,
            operatingCashFlow: 28062
        },
        {
            period: "FY2025",
            periodType: "annual",
            revenue: 130497,
            grossProfit: 97208,
            operatingIncome: 81225,
            netIncome: 72880,
            ebitda: 85240,
            totalAssets: 126500,
            totalDebt: 8450,
            cashAndEquivalents: 38500,
            sharesOutstanding: 2448,
            eps: 29.04,
            dividendsPerShare: 0.04,
            capex: 5240,
            operatingCashFlow: 73120
        }
    ],
    earnings: [
        {
            period: "Q1 FY2025",
            epsEstimate: 5.55,
            epsActual: 6.12,
            revenueEstimate: 24200,
            revenueActual: 26044,
            surprise: 10.27,
            reportDate: "2024-05-22"
        },
        {
            period: "Q2 FY2025",
            epsEstimate: 6.41,
            epsActual: 6.81,
            revenueEstimate: 28500,
            revenueActual: 30040,
            surprise: 6.24,
            reportDate: "2024-08-28"
        },
        {
            period: "Q3 FY2025",
            epsEstimate: 7.54,
            epsActual: 8.24,
            revenueEstimate: 33000,
            revenueActual: 35100,
            surprise: 9.28,
            reportDate: "2024-11-20"
        },
        {
            period: "Q4 FY2025",
            epsEstimate: 8.52,
            epsActual: 9.12,
            revenueEstimate: 38500,
            revenueActual: 39330,
            surprise: 7.04,
            reportDate: "2025-02-26"
        },
        {
            period: "Q1 FY2026",
            epsEstimate: 9.75,
            epsActual: null,
            revenueEstimate: 43000,
            revenueActual: null,
            surprise: null,
            reportDate: "2025-05-28"
        }
    ],
    analysts: [
        {
            firm: "Goldman Sachs",
            rating: "Buy",
            priceTarget: 165,
            date: "2025-02-28",
            summary: "Blackwell ramp exceeding expectations. AI infrastructure buildout still in early innings."
        },
        {
            firm: "Morgan Stanley",
            rating: "Overweight",
            priceTarget: 160,
            date: "2025-02-25",
            summary: "Data center demand far outstrips supply. Blackwell Ultra cycle driving sustained growth."
        },
        {
            firm: "Bank of America",
            rating: "Buy",
            priceTarget: 170,
            date: "2025-02-20",
            summary: "AI training and inference demand growing exponentially. NVIDIA's moat deepening."
        },
        {
            firm: "JPMorgan",
            rating: "Overweight",
            priceTarget: 155,
            date: "2025-02-15",
            summary: "Networking business (Mellanox) adding value. Software ecosystem (CUDA) creates switching costs."
        },
        {
            firm: "Bernstein",
            rating: "Market Perform",
            priceTarget: 130,
            date: "2025-02-10",
            summary: "Growth priced in at current multiples. Risk of demand normalization in 2026."
        }
    ],
    theses: [
        {
            type: "bull",
            title: "AI Infrastructure Spending is Just Beginning",
            summary: "The global AI infrastructure buildout is in its early stages. Every hyperscaler, sovereign AI initiative, and enterprise needs NVIDIA GPUs. The Blackwell architecture extends NVIDIA's leadership, and the software moat (CUDA) makes switching nearly impossible.",
            priceTarget: 170,
            keyDrivers: [
                "Blackwell/B100 ramp driving ASP increases",
                "Data center revenue growing 100%+ YoY",
                "Software moat (CUDA) creating durable competitive advantage",
                "Networking revenue from Mellanox accelerating"
            ],
            risks: [
                "Custom silicon (Google TPU, Amazon Trainium) gaining share",
                "Export controls limiting China revenue",
                "Demand could overshoot and normalize sharply"
            ],
            catalysts: [
                "Blackwell Ultra launch",
                "Hyperscaler capex announcements",
                "Data center revenue guidance"
            ],
            conviction: "high"
        },
        {
            type: "base",
            title: "Sustained Growth Moderating to 40-50%",
            summary: "NVIDIA continues to dominate AI chip market but growth naturally moderates from triple digits. Blackwell cycle provides strong FY2026, then growth normalizes. Still best-in-class margins and cash flow generation.",
            priceTarget: 140,
            keyDrivers: [
                "Data center revenue growing 50% in FY2026",
                "Gaming and auto providing diversification",
                "Gross margins stabilizing at 73-75%",
                "Strong free cash flow funding R&D"
            ],
            risks: [
                "Competition from AMD MI300 and custom silicon",
                "Customer concentration (top 5 = 50%+ revenue)",
                "Inventory correction risk if demand slows"
            ],
            catalysts: [
                "Quarterly earnings and guidance",
                "New product launches",
                "Customer commentary on AI spending"
            ],
            conviction: "medium"
        },
        {
            type: "bear",
            title: "AI Spending Bubble and Competitive Erosion",
            summary: "Hyperscaler AI capex is unsustainable and will slow dramatically. Custom silicon programs (Google TPU, Amazon Trainium, Microsoft Maia) will erode NVIDIA's market share. Current valuation assumes perpetual hypergrowth.",
            priceTarget: 85,
            keyDrivers: [
                "Hyperscaler capex normalization in 2026+",
                "Custom silicon eating into GPU demand",
                "AMD MI300 gaining traction in inference",
                "China revenue permanently impaired by export controls"
            ],
            risks: [
                "Revenue miss could trigger massive multiple compression",
                "Inventory buildup across supply chain",
                "Gross margin pressure from competition"
            ],
            catalysts: [
                "Hyperscaler capex guidance cuts",
                "AMD competitive product launches",
                "Export control tightening"
            ],
            conviction: "medium"
        }
    ]
};
// ===================== PLTR =====================
const pltrData = {
    info: {
        ticker: "PLTR",
        name: "Palantir Technologies Inc.",
        sector: "Technology",
        industry: "Software—Application",
        description: "Palantir Technologies Inc. builds software that helps organizations integrate, manage, and analyze large datasets. The company offers Palantir Gotham for government intelligence and military operations, Palantir Foundry for commercial data analytics, and Palantir Apollo for software deployment. Palantir has emerged as a leader in AI platform (AIP) deployment for enterprise.",
        ceo: "Alex Karp",
        headquarters: "Denver, Colorado",
        employees: 3838,
        founded: 2003,
        website: "palantir.com",
        price: 125.75,
        changePercent: 3.45,
        marketCap: 285000000000,
        peRatio: 465,
        forwardPE: 145,
        psRatio: 55.2,
        pbRatio: 27.8,
        evToEbitda: 320,
        dividendYield: 0,
        beta: 2.35,
        high52Week: 133.48,
        low52Week: 20.28,
        avgVolume: 82000000
    },
    financials: [
        {
            period: "FY2021",
            periodType: "annual",
            revenue: 1540,
            grossProfit: 1213,
            operatingIncome: -137,
            netIncome: -238,
            ebitda: 78,
            totalAssets: 4587,
            totalDebt: 210,
            cashAndEquivalents: 2343,
            sharesOutstanding: 1970,
            eps: -0.12,
            dividendsPerShare: 0,
            capex: 52,
            operatingCashFlow: 377
        },
        {
            period: "FY2022",
            periodType: "annual",
            revenue: 1906,
            grossProfit: 1497,
            operatingIncome: -98,
            netIncome: -213,
            ebitda: 122,
            totalAssets: 4918,
            totalDebt: 210,
            cashAndEquivalents: 2080,
            sharesOutstanding: 2056,
            eps: -0.10,
            dividendsPerShare: 0,
            capex: 48,
            operatingCashFlow: 330
        },
        {
            period: "FY2023",
            periodType: "annual",
            revenue: 2256,
            grossProfit: 1826,
            operatingIncome: 109,
            netIncome: 74,
            ebitda: 325,
            totalAssets: 5141,
            totalDebt: 210,
            cashAndEquivalents: 1824,
            sharesOutstanding: 2185,
            eps: 0.03,
            dividendsPerShare: 0,
            capex: 48,
            operatingCashFlow: 525
        },
        {
            period: "FY2024",
            periodType: "annual",
            revenue: 2873,
            grossProfit: 2360,
            operatingIncome: 337,
            netIncome: 264,
            ebitda: 555,
            totalAssets: 5678,
            totalDebt: 210,
            cashAndEquivalents: 2550,
            sharesOutstanding: 2268,
            eps: 0.12,
            dividendsPerShare: 0,
            capex: 55,
            operatingCashFlow: 720
        }
    ],
    earnings: [
        {
            period: "Q1 2024",
            epsEstimate: 0.08,
            epsActual: 0.08,
            revenueEstimate: 615,
            revenueActual: 634,
            surprise: 0.0,
            reportDate: "2024-05-06"
        },
        {
            period: "Q2 2024",
            epsEstimate: 0.09,
            epsActual: 0.09,
            revenueEstimate: 652,
            revenueActual: 678,
            surprise: 0.0,
            reportDate: "2024-08-05"
        },
        {
            period: "Q3 2024",
            epsEstimate: 0.09,
            epsActual: 0.10,
            revenueEstimate: 700,
            revenueActual: 726,
            surprise: 11.11,
            reportDate: "2024-11-04"
        },
        {
            period: "Q4 2024",
            epsEstimate: 0.11,
            epsActual: 0.14,
            revenueEstimate: 776,
            revenueActual: 828,
            surprise: 27.27,
            reportDate: "2025-02-13"
        },
        {
            period: "Q1 2025",
            epsEstimate: 0.13,
            epsActual: null,
            revenueEstimate: 860,
            revenueActual: null,
            surprise: null,
            reportDate: "2025-05-05"
        }
    ],
    analysts: [
        {
            firm: "Wedbush",
            rating: "Outperform",
            priceTarget: 140,
            date: "2025-02-14",
            summary: "AIP platform adoption is transformational. Commercial revenue acceleration is real."
        },
        {
            firm: "Bank of America",
            rating: "Buy",
            priceTarget: 130,
            date: "2025-02-12",
            summary: "AI platform leader with expanding commercial use cases. Government contracts provide floor."
        },
        {
            firm: "Morgan Stanley",
            rating: "Equal Weight",
            priceTarget: 95,
            date: "2025-01-28",
            summary: "Strong execution but valuation stretched. Need to see sustained commercial acceleration."
        },
        {
            firm: "Jefferies",
            rating: "Hold",
            priceTarget: 100,
            date: "2025-01-15",
            summary: "Great company, expensive stock. AIP is compelling but priced for perfection."
        },
        {
            firm: "Citi",
            rating: "Sell",
            priceTarget: 65,
            date: "2025-01-10",
            summary: "Valuation disconnected from fundamentals. Revenue growth doesn't justify 50x+ sales."
        }
    ],
    theses: [
        {
            type: "bull",
            title: "AIP is the Enterprise AI Operating System",
            summary: "Palantir's Artificial Intelligence Platform (AIP) is becoming the de facto operating system for enterprise AI deployment. The bootcamp-led sales motion is driving explosive commercial growth, and government contracts provide a stable revenue base. The company is at an inflection point from niche to mainstream.",
            priceTarget: 150,
            keyDrivers: [
                "AIP platform driving 40%+ US commercial revenue growth",
                "Bootcamp-led sales motion reducing sales cycles by 70%",
                "Government AI spending accelerating",
                "Rule of 40 score exceeding 60"
            ],
            risks: [
                "Extreme valuation — any growth deceleration is punished",
                "Key person risk (Alex Karp)",
                "Competition from hyperscaler AI platforms"
            ],
            catalysts: [
                "US commercial revenue growth rate",
                "New large enterprise AIP deployments",
                "Government contract wins (TITAN, etc.)"
            ],
            conviction: "medium"
        },
        {
            type: "base",
            title: "Strong AI Play at a Premium Price",
            summary: "Palantir is well-positioned for enterprise AI adoption. Commercial revenue is accelerating and margins are expanding. However, current valuation already prices in sustained hypergrowth, limiting upside from current levels.",
            priceTarget: 120,
            keyDrivers: [
                "Commercial revenue growing 30% CAGR",
                "Operating margins reaching 25-30%",
                "Government revenue growing 10-15%",
                "Free cash flow margin expanding to 30%+"
            ],
            risks: [
                "Valuation leaves no room for error",
                "Customer concentration in government",
                "Competition from Databricks, Snowflake, hyperscalers"
            ],
            catalysts: [
                "Quarterly commercial revenue growth",
                "New AIP use cases and customer wins",
                "Operating margin trajectory"
            ],
            conviction: "medium"
        },
        {
            type: "bear",
            title: "Valuation Disconnect from Reality",
            summary: "Palantir trades at 55x sales and 465x earnings — multiples that require flawless execution for years. Commercial growth, while improving, is still early. Government revenue growth is decelerating. AI hype is inflating the stock beyond reasonable fundamentals.",
            priceTarget: 60,
            keyDrivers: [
                "Revenue base too small ($2.9B) to justify $285B market cap",
                "Government growth decelerating",
                "Commercial growth is from a small base",
                "Insider selling accelerating"
            ],
            risks: [
                "Massive multiple compression risk",
                "AI hype cycle could deflate",
                "Lockup expirations and insider selling pressure"
            ],
            catalysts: [
                "Revenue miss or guidance cut",
                "AI spending scrutiny in government",
                "Competitive losses to hyperscaler AI tools"
            ],
            conviction: "medium"
        }
    ]
};
const stockDataMap = {
    AAPL: aaplData,
    MSFT: msftData,
    NVDA: nvdaData,
    PLTR: pltrData
};
const allTickers = Object.keys(stockDataMap);
function getStockData(ticker) {
    return stockDataMap[ticker.toUpperCase()];
}
function calculateComps(tickers) {
    const stocks = tickers.map((t)=>stockDataMap[t.toUpperCase()]).filter(Boolean);
    return stocks.map((s)=>({
            ticker: s.info.ticker,
            name: s.info.name,
            price: s.info.price,
            marketCap: s.info.marketCap,
            peRatio: s.info.peRatio,
            forwardPE: s.info.forwardPE,
            psRatio: s.info.psRatio,
            pbRatio: s.info.pbRatio,
            evToEbitda: s.info.evToEbitda,
            dividendYield: s.info.dividendYield,
            revenueGrowth: calculateRevenueGrowth(s),
            grossMargin: calculateGrossMargin(s),
            operatingMargin: calculateOperatingMargin(s),
            netMargin: calculateNetMargin(s),
            fcfYield: calculateFCFYield(s),
            roic: calculateROIC(s)
        }));
}
function calculateRevenueGrowth(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length < 2) return 0;
    const latest = annual[annual.length - 1];
    const prev = annual[annual.length - 2];
    return (latest.revenue - prev.revenue) / prev.revenue * 100;
}
function calculateGrossMargin(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length === 0) return 0;
    const latest = annual[annual.length - 1];
    return latest.grossProfit / latest.revenue * 100;
}
function calculateOperatingMargin(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length === 0) return 0;
    const latest = annual[annual.length - 1];
    return latest.operatingIncome / latest.revenue * 100;
}
function calculateNetMargin(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length === 0) return 0;
    const latest = annual[annual.length - 1];
    return latest.netIncome / latest.revenue * 100;
}
function calculateFCFYield(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length === 0) return 0;
    const latest = annual[annual.length - 1];
    const fcf = latest.operatingCashFlow - latest.capex;
    return fcf / s.info.marketCap * 100;
}
function calculateROIC(s) {
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    if (annual.length === 0) return 0;
    const latest = annual[annual.length - 1];
    const nopat = latest.operatingIncome * (1 - 0.21);
    const investedCapital = latest.totalAssets - (latest.totalAssets - latest.totalDebt - latest.cashAndEquivalents > 0 ? latest.cashAndEquivalents : 0);
    if (investedCapital === 0) return 0;
    return nopat / investedCapital * 100;
}
function calculateDCF(ticker) {
    const s = getStockData(ticker);
    if (!s) throw new Error(`Stock ${ticker} not found`);
    const annual = s.financials.filter((f)=>f.periodType === "annual");
    const latest = annual[annual.length - 1];
    // Base case assumptions
    const revenueGrowthYears = [
        0.12,
        0.10,
        0.08,
        0.07,
        0.06
    ];
    const ebitMargins = [
        0.32,
        0.33,
        0.34,
        0.35,
        0.35
    ];
    const daPercent = latest.capex > 0 ? (latest.ebitda - latest.operatingIncome) / latest.revenue : 0.05;
    const capexPercent = latest.capex / latest.revenue;
    const nwcPercent = 0.02;
    const taxRate = 0.21;
    // WACC calculation
    const riskFreeRate = 0.043;
    const equityRiskPremium = 0.055;
    const beta = s.info.beta;
    const costOfEquity = riskFreeRate + beta * equityRiskPremium;
    const marketCap = s.info.marketCap;
    const netDebt = latest.totalDebt - latest.cashAndEquivalents;
    const ev = marketCap + netDebt;
    const equityWeight = marketCap / ev;
    const debtWeight = netDebt > 0 ? netDebt / ev : 0;
    const costOfDebt = 0.045;
    const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);
    const wacc = costOfEquity * equityWeight + afterTaxCostOfDebt * debtWeight;
    const terminalGrowth = 0.03;
    const shares = latest.sharesOutstanding;
    let prevRevenue = latest.revenue;
    const projections = [];
    let totalPVFCF = 0;
    for(let i = 0; i < 5; i++){
        const revenue = prevRevenue * (1 + revenueGrowthYears[i]);
        const growth = revenueGrowthYears[i];
        const ebit = revenue * ebitMargins[i];
        const nopat = ebit * (1 - taxRate);
        const da = revenue * daPercent;
        const capex = revenue * capexPercent;
        const nwc = (revenue - prevRevenue) * nwcPercent;
        const fcf = nopat + da - capex - nwc;
        const period = i + 0.5;
        const discountFactor = 1 / Math.pow(1 + wacc, period);
        const pvFCF = fcf * discountFactor;
        totalPVFCF += pvFCF;
        projections.push({
            year: `FY${2025 + i}E`,
            revenue: Math.round(revenue),
            revenueGrowth: growth * 100,
            ebitMargin: ebitMargins[i] * 100,
            nopat: Math.round(nopat),
            da: Math.round(da),
            capex: Math.round(capex),
            nwc: Math.round(nwc),
            fcf: Math.round(fcf),
            discountFactor,
            pvFCF: Math.round(pvFCF)
        });
        prevRevenue = revenue;
    }
    // Terminal value
    const terminalFCF = projections[4].fcf * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (wacc - terminalGrowth);
    const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);
    const enterpriseValue = totalPVFCF + pvTerminal;
    const equityValue = enterpriseValue - netDebt;
    const impliedPrice = equityValue / (shares * 1000000);
    const upside = (impliedPrice - s.info.price) / s.info.price * 100;
    // Sensitivity: WACC vs Terminal Growth
    const waccRange = [
        wacc - 0.02,
        wacc - 0.01,
        wacc,
        wacc + 0.01,
        wacc + 0.02
    ];
    const tgrRange = [
        terminalGrowth - 0.01,
        terminalGrowth - 0.005,
        terminalGrowth,
        terminalGrowth + 0.005,
        terminalGrowth + 0.01
    ];
    const waccVsTerminalGrowth = waccRange.map((w)=>tgrRange.map((tg)=>{
            let pvFCFSens = 0;
            let prevRev = latest.revenue;
            for(let i = 0; i < 5; i++){
                const rev = prevRev * (1 + revenueGrowthYears[i]);
                const ebitSens = rev * ebitMargins[i];
                const nopatSens = ebitSens * (1 - taxRate);
                const daSens = rev * daPercent;
                const capexSens = rev * capexPercent;
                const nwcSens = (rev - prevRev) * nwcPercent;
                const fcfSens = nopatSens + daSens - capexSens - nwcSens;
                pvFCFSens += fcfSens / Math.pow(1 + w, i + 0.5);
                prevRev = rev;
            }
            const terminalFCFSens = projections[4].fcf * (1 + tg);
            const tvSens = terminalFCFSens / (w - tg);
            const pvTVSens = tvSens / Math.pow(1 + w, 5);
            const evSens = pvFCFSens + pvTVSens;
            const eqSens = evSens - netDebt;
            const priceSens = eqSens / (shares * 1000000);
            return {
                wacc: w,
                terminalGrowth: tg,
                impliedPrice: Math.round(priceSens * 100) / 100
            };
        }));
    // Sensitivity: Revenue Growth vs EBIT Margin
    const growthRange = [
        0.04,
        0.08,
        0.12,
        0.16,
        0.20
    ];
    const marginRange = [
        0.25,
        0.30,
        0.35,
        0.40,
        0.45
    ];
    const revenueVsMargin = growthRange.map((g)=>marginRange.map((m)=>{
            let pvFCFSens = 0;
            let prevRev = latest.revenue;
            for(let i = 0; i < 5; i++){
                const rev = prevRev * (1 + g);
                const ebitSens = rev * m;
                const nopatSens = ebitSens * (1 - taxRate);
                const daSens = rev * daPercent;
                const capexSens = rev * capexPercent;
                const nwcSens = (rev - prevRev) * nwcPercent;
                const fcfSens = nopatSens + daSens - capexSens - nwcSens;
                pvFCFSens += fcfSens / Math.pow(1 + wacc, i + 0.5);
                prevRev = rev;
            }
            const terminalFCFSens = fcfBase(g, m, latest.revenue, taxRate, daPercent, capexPercent, nwcPercent) * (1 + terminalGrowth);
            const tvSens = terminalFCFSens / (wacc - terminalGrowth);
            const pvTVSens = tvSens / Math.pow(1 + wacc, 5);
            const evSens = pvFCFSens + pvTVSens;
            const eqSens = evSens - netDebt;
            const priceSens = eqSens / (shares * 1000000);
            return {
                revenueGrowth: g,
                margin: m,
                impliedPrice: Math.round(priceSens * 100) / 100
            };
        }));
    function fcfBase(g, m, baseRev, tax, daPct, capexPct, nwcPct) {
        let prevRev = baseRev;
        for(let i = 0; i < 5; i++){
            prevRev = prevRev * (1 + g);
        }
        const ebitSens = prevRev * m;
        const nopatSens = ebitSens * (1 - tax);
        const daSens = prevRev * daPct;
        const capexSens = prevRev * capexPct;
        const prevRev2 = prevRev / (1 + g);
        const nwcSens = (prevRev - prevRev2) * nwcPct;
        return nopatSens + daSens - capexSens - nwcSens;
    }
    return {
        ticker: s.info.ticker,
        currentPrice: s.info.price,
        impliedPrice: Math.round(impliedPrice * 100) / 100,
        upside: Math.round(upside * 100) / 100,
        enterpriseValue: Math.round(enterpriseValue),
        equityValue: Math.round(equityValue),
        pvFCF: Math.round(totalPVFCF),
        pvTerminal: Math.round(pvTerminal),
        wacc: Math.round(wacc * 10000) / 100,
        terminalGrowth: terminalGrowth * 100,
        projections,
        sensitivity: {
            waccVsTerminalGrowth,
            revenueVsMargin
        }
    };
}
function formatLargeNumber(num) {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
}
function formatPercent(num) {
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}
function formatPrice(num) {
    return `$${num.toFixed(2)}`;
}
function getRatingColor(rating) {
    const r = rating.toLowerCase();
    if (r.includes("buy") || r.includes("outperform") || r.includes("overweight")) return "text-emerald-600";
    if (r.includes("sell") || r.includes("underperform") || r.includes("underweight")) return "text-red-600";
    return "text-amber-600";
}
function getConvictionBadge(conviction) {
    switch(conviction){
        case "high":
            return {
                bg: "bg-emerald-100",
                text: "text-emerald-800"
            };
        case "medium":
            return {
                bg: "bg-amber-100",
                text: "text-amber-800"
            };
        case "low":
            return {
                bg: "bg-red-100",
                text: "text-red-800"
            };
        default:
            return {
                bg: "bg-gray-100",
                text: "text-gray-800"
            };
    }
}
function getThesisColor(type) {
    switch(type){
        case "bull":
            return {
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                badge: "bg-emerald-600"
            };
        case "bear":
            return {
                bg: "bg-red-50",
                border: "border-red-200",
                badge: "bg-red-600"
            };
        case "base":
            return {
                bg: "bg-blue-50",
                border: "border-blue-200",
                badge: "bg-blue-600"
            };
        default:
            return {
                bg: "bg-gray-50",
                border: "border-gray-200",
                badge: "bg-gray-600"
            };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/nav.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/stock-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function HomePage() {
    _s();
    const stocks = Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stockDataMap"]);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("featured");
    const [usStocks, setUsStocks] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HomePage.useEffect": ()=>{
            if (activeTab === "us" && usStocks.length === 0) {
                setLoading(true);
                fetch("http://localhost:8000/api/us_buys").then({
                    "HomePage.useEffect": (res)=>res.json()
                }["HomePage.useEffect"]).then({
                    "HomePage.useEffect": (data)=>{
                        if (data && data.data) {
                            setUsStocks(data.data);
                        }
                    }
                }["HomePage.useEffect"]).catch({
                    "HomePage.useEffect": (err)=>console.error("Error fetching US stocks:", err)
                }["HomePage.useEffect"]).finally({
                    "HomePage.useEffect": ()=>setLoading(false)
                }["HomePage.useEffect"]);
            }
        }
    }["HomePage.useEffect"], [
        activeTab
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Nav"], {}, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto max-w-[1440px] px-6 py-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-8 flex items-center justify-between",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-3xl font-bold text-slate-900",
                                    children: "Equity Research Dashboard"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/page.tsx",
                                    lineNumber: 36,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 text-slate-600",
                                    children: [
                                        "Institutional-grade stock analysis inspired by",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: "https://github.com/anthropics/financial-services",
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            className: "text-indigo-600 hover:text-indigo-800 underline",
                                            children: "Anthropic's Financial Services"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/page.tsx",
                                            lineNumber: 39,
                                            columnNumber: 15
                                        }, this),
                                        " ",
                                        "repo — adapted for Swingmaster US Markets."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/page.tsx",
                                    lineNumber: 37,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-8 border-b border-slate-200",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            className: "-mb-px flex space-x-8",
                            "aria-label": "Tabs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setActiveTab("featured"),
                                    className: `${activeTab === "featured" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`,
                                    children: "Featured Core Analysis"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/page.tsx",
                                    lineNumber: 55,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setActiveTab("us"),
                                    className: `${activeTab === "us" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`,
                                    children: "Swingmaster US Stocks"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/page.tsx",
                                    lineNumber: 65,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 54,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    activeTab === "featured" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-semibold text-indigo-900",
                                        children: "About the Anthropic Financial-Services Repository"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 82,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-sm text-indigo-800 leading-relaxed",
                                        children: [
                                            "The ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "https://github.com/anthropics/financial-services",
                                                target: "_blank",
                                                rel: "noopener noreferrer",
                                                className: "underline font-medium",
                                                children: "anthropics/financial-services"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/page.tsx",
                                                lineNumber: 86,
                                                columnNumber: 21
                                            }, this),
                                            " repo provides reference agents, skills, and data connectors for financial services workflows. This tab shows the original static demonstration."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 85,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 81,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4",
                                children: stocks.map((s)=>{
                                    const annual = s.financials.filter((f)=>f.periodType === "annual");
                                    const latest = annual[annual.length - 1];
                                    const prev = annual.length >= 2 ? annual[annual.length - 2] : null;
                                    const revGrowth = prev ? (latest.revenue - prev.revenue) / prev.revenue * 100 : 0;
                                    const grossMargin = latest.grossProfit / latest.revenue * 100;
                                    const netMargin = latest.netIncome / latest.revenue * 100;
                                    const latestEarnings = s.earnings.filter((e)=>e.epsActual !== null).slice(-1)[0];
                                    const surprise = latestEarnings?.surprise ?? 0;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/stocks/${s.info.ticker}`,
                                        className: "group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-start justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xl font-bold text-slate-900",
                                                                        children: s.info.ticker
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/page.tsx",
                                                                        lineNumber: 113,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600",
                                                                        children: s.info.sector
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/page.tsx",
                                                                        lineNumber: 114,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 112,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "mt-1 text-sm text-slate-500",
                                                                children: s.info.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 118,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 111,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-lg font-bold text-slate-900",
                                                                children: [
                                                                    "$",
                                                                    s.info.price.toFixed(2)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 121,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: `text-sm font-medium ${s.info.changePercent >= 0 ? "text-emerald-600" : "text-red-600"}`,
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatPercent"])(s.info.changePercent)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 122,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 120,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/page.tsx",
                                                lineNumber: 110,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 grid grid-cols-2 gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500",
                                                                children: "Market Cap"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 130,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-semibold text-slate-900",
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatLargeNumber"])(s.info.marketCap)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 131,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 129,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500",
                                                                children: "P/E Ratio"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 134,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-semibold text-slate-900",
                                                                children: [
                                                                    s.info.peRatio.toFixed(1),
                                                                    "x"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 135,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 133,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500",
                                                                children: "Revenue Growth"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 138,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: `text-sm font-semibold ${revGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`,
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$stock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatPercent"])(revGrowth)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 139,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 137,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500",
                                                                children: "Gross Margin"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 144,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-semibold text-slate-900",
                                                                children: [
                                                                    grossMargin.toFixed(1),
                                                                    "%"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 145,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 143,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/page.tsx",
                                                lineNumber: 128,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 border-t border-slate-100 pt-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between text-xs",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-500",
                                                                children: "Latest EPS Surprise"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 151,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `font-semibold ${surprise >= 0 ? "text-emerald-600" : "text-red-600"}`,
                                                                children: [
                                                                    surprise >= 0 ? "+" : "",
                                                                    surprise?.toFixed(2) ?? "N/A",
                                                                    "%"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 152,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 150,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-1 flex items-center justify-between text-xs",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-500",
                                                                children: "Net Margin"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 157,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-semibold text-slate-900",
                                                                children: [
                                                                    netMargin.toFixed(1),
                                                                    "%"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 158,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 156,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/page.tsx",
                                                lineNumber: 149,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-800",
                                                    children: "View Analysis →"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/page.tsx",
                                                    lineNumber: 163,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/page.tsx",
                                                lineNumber: 162,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, s.info.ticker, true, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 105,
                                        columnNumber: 19
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 92,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-6 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xl font-bold text-slate-900",
                                        children: "US Markets Analysis"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800",
                                        children: [
                                            usStocks.length,
                                            " Signals Found"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 176,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 174,
                                columnNumber: 13
                            }, this),
                            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "py-20 text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 183,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-4 text-slate-500",
                                        children: "Loading US stocks from Swingmaster Backend..."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 184,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 182,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3",
                                children: [
                                    usStocks.map((s, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start justify-between border-b border-slate-100 pb-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-xl font-bold text-slate-900",
                                                                            children: s.symbol
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/app/page.tsx",
                                                                            lineNumber: 193,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: `rounded-md px-2 py-0.5 text-xs font-bold ${s.action === "STRONG BUY" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`,
                                                                            children: s.action
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/app/page.tsx",
                                                                            lineNumber: 194,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 192,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "mt-1 text-sm text-slate-500",
                                                                    children: [
                                                                        "Entry: $",
                                                                        s.entry?.toFixed(2)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 198,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 191,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-right",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20",
                                                                children: [
                                                                    s.confidence?.toFixed(1),
                                                                    "% Conviction"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/page.tsx",
                                                                lineNumber: 201,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 200,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/page.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-4 grid grid-cols-2 gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded bg-slate-50 p-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: "Target (TP)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 209,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm font-semibold text-emerald-600",
                                                                    children: [
                                                                        "$",
                                                                        s.target?.toFixed(2)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 210,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 208,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded bg-slate-50 p-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: "Stoploss (SL)"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 213,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm font-semibold text-red-600",
                                                                    children: [
                                                                        "$",
                                                                        s.stoploss?.toFixed(2)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 214,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded bg-slate-50 p-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: "Hist. Win Rate"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 217,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm font-semibold text-slate-900",
                                                                    children: [
                                                                        s.backtest?.win_rate?.toFixed(1),
                                                                        "%"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 218,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "rounded bg-slate-50 p-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-xs text-slate-500",
                                                                    children: "Vol. Spike"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 221,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-sm font-semibold text-slate-900",
                                                                    children: [
                                                                        s.volume_ratio?.toFixed(1),
                                                                        "x"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/page.tsx",
                                                                    lineNumber: 222,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 220,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/page.tsx",
                                                    lineNumber: 207,
                                                    columnNumber: 21
                                                }, this),
                                                s.rationale && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-4 rounded-xl bg-slate-50 p-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs font-semibold text-slate-700 mb-1",
                                                            children: "AI Thesis"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 228,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-slate-600 line-clamp-3",
                                                            children: s.rationale
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/page.tsx",
                                                            lineNumber: 229,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/page.tsx",
                                                    lineNumber: 227,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-4 text-center",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        href: `/stocks/us/${s.symbol}`,
                                                        className: "inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-800",
                                                        children: "View Detailed Analysis →"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/page.tsx",
                                                        lineNumber: 234,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/page.tsx",
                                                    lineNumber: 233,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, `${s.symbol}-${idx}`, true, {
                                            fileName: "[project]/src/app/page.tsx",
                                            lineNumber: 189,
                                            columnNumber: 19
                                        }, this)),
                                    usStocks.length === 0 && !loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-slate-500",
                                            children: "No US stocks found. Make sure the Swingmaster backend is running on port 8000."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/page.tsx",
                                            lineNumber: 243,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/page.tsx",
                                        lineNumber: 242,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 187,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(HomePage, "lhNDi+1MDrDO3hfpqvBeRbu3coU=");
_c = HomePage;
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_135rrdi._.js.map
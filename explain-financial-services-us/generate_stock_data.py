import json
import yfinance as yf
import os

def generate_stock_data():
    symbols = json.load(open('us_symbols.json'))
    # No limit, fetch all
    
    all_data = {}
    
    for symbol in symbols:
        try:
            print(f"Fetching {symbol}...")
            t = yf.Ticker(symbol)
            info = t.info
            
            # Basic info
            stock_info = {
                "ticker": symbol,
                "name": info.get("shortName", symbol),
                "sector": info.get("sector", "Technology"),
                "industry": info.get("industry", "Other"),
                "description": info.get("longBusinessSummary", ""),
                "ceo": info.get("companyOfficers", [{}])[0].get("name", "N/A") if info.get("companyOfficers") else "N/A",
                "headquarters": f"{info.get('city', 'N/A')}, {info.get('state', 'N/A')}",
                "employees": info.get("fullTimeEmployees", 0),
                "founded": 0, # yfinance doesn't usually have this
                "website": info.get("website", ""),
                "price": info.get("currentPrice", 0),
                "changePercent": info.get("regularMarketChangePercent", 0),
                "marketCap": info.get("marketCap", 0),
                "peRatio": info.get("trailingPE", 0),
                "forwardPE": info.get("forwardPE", 0),
                "psRatio": info.get("priceToSalesTrailing12Months", 0),
                "pbRatio": info.get("priceToBook", 0),
                "evToEbitda": info.get("enterpriseToEbitda", 0),
                "dividendYield": info.get("dividendYield", 0),
                "beta": info.get("beta", 1.0),
                "high52Week": info.get("fiftyTwoWeekHigh", 0),
                "low52Week": info.get("fiftyTwoWeekLow", 0),
                "avgVolume": info.get("averageVolume", 0),
            }
            
            # Simple mock financials based on current info
            rev = info.get("totalRevenue", 1000000000)
            ni = info.get("netIncomeToCommon", rev * 0.1)
            gp = info.get("grossProfits", rev * 0.4)
            ebitda = info.get("ebitda", rev * 0.2)
            
            financials = [
                {
                    "period": "FY2023",
                    "periodType": "annual",
                    "revenue": rev / 1000000,
                    "grossProfit": gp / 1000000,
                    "operatingIncome": (ebitda * 0.8) / 1000000,
                    "netIncome": ni / 1000000,
                    "ebitda": ebitda / 1000000,
                    "totalAssets": info.get("totalAssets", rev * 2) / 1000000,
                    "totalDebt": info.get("totalDebt", rev * 0.5) / 1000000,
                    "cashAndEquivalents": info.get("totalCash", rev * 0.1) / 1000000,
                    "sharesOutstanding": info.get("sharesOutstanding", 1000000000) / 1000000,
                    "eps": info.get("trailingEps", 0),
                    "dividendsPerShare": info.get("dividendRate", 0),
                    "capex": (rev * 0.05) / 1000000,
                    "operatingCashFlow": info.get("operatingCashflow", ebitda) / 1000000,
                }
            ]
            
            # Mock theses
            theses = [
                {
                    "type": "bull",
                    "title": f"Growth in {stock_info['sector']}",
                    "summary": f"{stock_info['name']} is well positioned to capture market share in {stock_info['industry']}.",
                    "priceTarget": stock_info['price'] * 1.2,
                    "keyDrivers": ["Market expansion", "Product innovation"],
                    "risks": ["Competition", "Macroeconomic factors"],
                    "catalysts": ["Earnings release", "New product launch"],
                    "conviction": "high"
                }
            ]
            
            all_data[symbol] = {
                "info": stock_info,
                "financials": financials,
                "earnings": [],
                "analysts": [],
                "theses": theses
            }
            
        except Exception as e:
            print(f"Error for {symbol}: {e}")
            
    with open('src/lib/all-stocks-data.json', 'w') as f:
        json.dump(all_data, f, indent=2)

if __name__ == "__main__":
    generate_stock_data()

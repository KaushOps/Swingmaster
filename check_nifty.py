import yfinance as yf
ticker = yf.Ticker('^NSEI')
hist = ticker.history(period='60d', interval='1d')
latest_close = hist['Close'].iloc[-1]
ema20 = hist['Close'].rolling(20).mean().iloc[-1]
print(f"Latest close: {latest_close:.2f}")
print(f"EMA20: {ema20:.2f}")
print(f"Under EMA: {latest_close < ema20}")
print(f"Pct from EMA: {((latest_close - ema20) / ema20 * 100):.2f}%")

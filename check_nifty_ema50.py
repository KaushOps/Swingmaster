import yfinance as yf
ticker = yf.Ticker('^NSEI')
hist = ticker.history(period='60d', interval='1d')
latest_close = hist['Close'].iloc[-1]
ema50 = hist['Close'].ewm(span=50, adjust=False).mean().iloc[-1]
print(f"Latest close: {latest_close:.2f}")
print(f"EMA50: {ema50:.2f}")
print(f"Above EMA50: {latest_close > ema50}")
print(f"Pct from EMA50: {((latest_close - ema50) / ema50 * 100):.2f}%")

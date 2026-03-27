# 🚀 Swingmaster AI 

Swingmaster is an AI-powered equity prediction scanner that analyzes 60+ top NSE stocks daily using Machine Learning (Random Forest) to generate high-probability 1-3 month swing trading signals.

## 📖 Trading Guide: How to Use the Signals

When the dashboard displays a **BUY** or **STRONG BUY** signal for a stock, it means the AI model has calculated a high statistical probability of an upward trend based on momentum, ATR-based volatility, and volume spikes.

### 1. The "Entry Price" Explained
The **ENTRY** price printed on the stock card is simply the **previous trading day's closing price**. It is the baseline price at which the AI generated the signal. It is **not** a strict trigger or limit price that you must wait for.

### 2. Should I Wait or Buy at the Current Market Price?
**Example Scenario:**
* **HAL Card Shows:** ENTRY ₹3669.40, BUY Signal
* **Live Market Price:** ₹3600 - ₹3610

If the live price is **lower** than the listed Entry price (like in the HAL example), this is an **ideal buying opportunity**. 
- You do **not** need to wait for the stock to rise back up to ₹3669.40 to buy it. 
- By buying at ₹3600, you are getting the stock at a discount to the AI's signal price, which means your Risk/Reward ratio actually improves (your Stoploss is further away, and your Target yields a higher percentage return).
- **Rule of Thumb:** If a BUY signal is active, buying anywhere near or below the Entry price is perfectly fine. 

*Caution:* If a stock opens with a massive gap down (e.g., drops 5-10% in one day due to catastrophic fundamental news or earnings failures), use caution, as extreme fundamental events can invalidate mathematical AI patterns.

### 3. Exits: Target and Stoploss
Once you enter a trade, you should immediately set your exits. The AI automatically calculates ideal exit points based on Average True Range (ATR) volatility.
* **TARGET:** You can place a GTT (Good Till Triggered) Limit Sell order at the exact Target price.
* **STOPLOSS:** Strictly honor the Stoploss to protect your capital. If a stock drops and closes near or below this level, exit the trade.

---

## 🖥 Dashboard Tabs Explained
1. **🎯 High Conviction:** The strictest AI filters (72%+ confidence, 1.5x Volume Spike, high ATR). These are rare but highly reliable signals. Always prioritize purchasing from this tier.
2. **🚀 All NSE (Buy Only):** Standard AI signals (55%+ confidence, 0.5x Volume Spike) across the broad NSE universe. Good for finding additional setups when High Conviction is empty.
3. **🇮🇳 India (NSE) / 🇺🇸 USA (NYSE):** Active grids showing the *current state* (Buy or Wait) of every stock analyzed.

## ⚙️ Technical Stack
* **Backend:** FastAPI, Python, Scikit-Learn (Random Forest Engine), Pandas, VectorBT
* **Frontend:** React, Vite, Recharts
* **Deployment Setup:** Render.com (Blueprint enabled `render.yaml`)

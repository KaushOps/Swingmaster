import pandas as pd
import ta
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds technical indicators to the dataframe."""
    df = df.copy()
    
    # RSI
    df['rsi'] = ta.momentum.rsi(df['close'], window=14)
    
    # MACD
    macd = ta.trend.MACD(close=df['close'])
    df['macd'] = macd.macd()
    df['signal'] = macd.macd_signal()
    
    # ATR
    atr = ta.volatility.AverageTrueRange(high=df['high'], low=df['low'], close=df['close'], window=14)
    df['atr'] = atr.average_true_range()
    
    # Volume Ratio
    df['volume_mean'] = df['volume'].rolling(20).mean()
    df['volume_ratio'] = np.where(df['volume_mean'] > 0, df['volume'] / df['volume_mean'], 1.0)
    
    # Returns
    df['returns'] = df['close'].pct_change()
    
    return df.dropna()

def create_labels(df: pd.DataFrame, target_atr_mult=2.0, sl_atr_mult=1.5, lookahead=40) -> pd.DataFrame:
    """
    Look ahead logic: Does the price hit Target before Stoploss within the lookahead window?
    Target = Close + (target_atr_mult * ATR)
    Stoploss = Close - (sl_atr_mult * ATR)
    """
    df = df.copy()
    df['label'] = 0
    
    closes = df['close'].values
    highs = df['high'].values
    lows = df['low'].values
    atrs = df['atr'].values
    
    labels = np.zeros(len(df))
    
    for i in range(len(df)):
        if np.isnan(atrs[i]):
            continue
            
        entry = closes[i]
        target = entry + (target_atr_mult * atrs[i])
        stoploss = entry - (sl_atr_mult * atrs[i])
        
        hit = 0
        end_idx = min(len(df), i + lookahead + 1)
        
        for j in range(i + 1, end_idx):
            if lows[j] <= stoploss:
                break # Stopped out first
            if highs[j] >= target:
                hit = 1
                break
                
        labels[i] = hit
        
    df['label'] = labels
    return df

class IntradayModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        self.features = ['rsi', 'macd', 'signal', 'atr', 'volume_ratio', 'returns']
        
    def train(self, df: pd.DataFrame):
        X = df[self.features]
        y = df['label']
        self.model.fit(X, y)
        
    def predict_proba(self, df: pd.DataFrame) -> pd.Series:
        X = df[self.features]
        probs = self.model.predict_proba(X)[:, 1] # Probability of class 1
        return pd.Series(index=df.index, data=probs)
    
    def predict_latest(self, df: pd.DataFrame):
        latest = df.iloc[[-1]]
        X = latest[self.features]
        prob = self.model.predict_proba(X)[0][1]
        return prob

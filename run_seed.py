import os
import json
import pandas as pd
from datetime import datetime

# Import TradeFlex components
import sys
sys.path.append('/home/ubuntu/swingmaster/backend')

from data_fetcher import fetch_daily_data, fetch_macro_data
from ml_model import add_features, create_labels, IntradayModel
from main import NSE_UNIVERSE, LEDGER_FILE, HC_PROB_UP, HC_VOL_RATIO, HC_ATR_FILTER
from adaptive_engine import ThresholdCalibrator, AdaptiveQualityGates, FeatureSnapshotStore

def main():
    print("Starting historical backfill for 2023 and 2024 (prior to 2025-04-01)...")
    
    # Load current ledger
    with open(LEDGER_FILE, 'r') as f:
        ledger = json.load(f)
        
    macro_df = fetch_macro_data(years=4)
    
    # Thresholds
    adaptive_thresholds = ThresholdCalibrator.get_dynamic_thresholds()
    std_prob = adaptive_thresholds.get('STD_PROB_UP', 0.55)
    std_vol = adaptive_thresholds.get('STD_VOL_RATIO', 0.5)
    hc_prob = adaptive_thresholds.get('HC_PROB_UP', HC_PROB_UP)
    hc_vol = adaptive_thresholds.get('HC_VOL_RATIO', HC_VOL_RATIO)
    
    needs_save = False
    
    for symbol in NSE_UNIVERSE:
        try:
            df = fetch_daily_data(symbol, years=4) # Fetch 4 years to cover 2023
            if len(df) < 100: continue
            
            df = add_features(df, macro_df)
            if len(df) < 80: continue
            
            df = create_labels(df)
            if len(df) < 50: continue
            
            sym = symbol.replace(".NS", "")
            
            model = IntradayModel.load(sym)
            if model is None:
                model = IntradayModel()
                model.train(df[:-60])
                model.save(sym)
                
            df['prob_up'] = model.predict_proba_walk_forward(df)
            
            entries = df[(df['prob_up'] > std_prob) & (df['volume_ratio'] > std_vol)]
            hc_entries = df[
                (df['prob_up'] > hc_prob) &
                (df['volume_ratio'] > hc_vol) &
                (df['atr'] / df['close'] > HC_ATR_FILTER)
            ]
            
            for date, row in entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                
                # IMPORTANT: Only backfill data prior to April 2025
                if date_str < "2025-04-01":
                    if date_str not in ledger["NSE_BUYS"]:
                        ledger["NSE_BUYS"][date_str] = {}
                        
                    if sym not in ledger["NSE_BUYS"][date_str]:
                        e_price = float(row['close'])
                        e_atr = float(row['atr'])
                        
                        ledger["NSE_BUYS"][date_str][sym] = {
                            "entry": e_price,
                            "target": e_price + (5.0 * e_atr),
                            "stoploss": e_price - (2.0 * e_atr),
                            "confidence": float(row['prob_up']),
                            "volume_ratio": float(row['volume_ratio'])
                        }
                        needs_save = True

            for date, row in hc_entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                
                # IMPORTANT: Only backfill data prior to April 2025
                if date_str < "2025-04-01":
                    if date_str not in ledger["HIGH_CONVICTION"]:
                        ledger["HIGH_CONVICTION"][date_str] = {}
                        
                    if sym not in ledger["HIGH_CONVICTION"][date_str]:
                        e_price = float(row['close'])
                        e_atr = float(row['atr'])
                        
                        ledger["HIGH_CONVICTION"][date_str][sym] = {
                            "entry": e_price,
                            "target": e_price + (5.0 * e_atr),
                            "stoploss": e_price - (2.0 * e_atr),
                            "confidence": float(row['prob_up']),
                            "volume_ratio": float(row['volume_ratio'])
                        }
                        needs_save = True
                        
            print(f"Processed {sym} for historical backfill.")
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            continue

    if needs_save:
        with open(LEDGER_FILE, 'w') as f:
            json.dump(ledger, f, indent=2)
        print("Historical backfill completed and ledger updated.")
    else:
        print("No new historical signals found.")

if __name__ == "__main__":
    main()

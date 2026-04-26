import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from ml_model import passes_quality_gates
from data_fetcher import is_weekly_bullish

def test_passes_quality_gates():
    # Valid row
    row = {
        'macd_hist': 0.1,
        'rsi': 55,
        'above_ema20': 1,
        'adx': 25,
        'pct_from_high': 0.8
    }
    assert passes_quality_gates(row) is True

    # Failed MACD
    row['macd_hist'] = -0.1
    assert passes_quality_gates(row) is False
    row['macd_hist'] = 0.1

    # Failed RSI
    row['rsi'] = 90
    assert passes_quality_gates(row) is False

def test_weekly_bullish_fail_closed(mocker):
    # Mock the fetch_weekly_data to raise an exception
    mocker.patch('data_fetcher.fetch_weekly_data', side_effect=Exception("API Error"))
    
    # Should fail closed and return False
    assert is_weekly_bullish("TCS.NS") is False

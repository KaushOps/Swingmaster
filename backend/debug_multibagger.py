from multibagger_model import calculate_multibagger_score
from data_fetcher import fetch_daily_data
df = fetch_daily_data('RELIANCE.NS', years=2)
print("DF length:", len(df))
print(calculate_multibagger_score(df))

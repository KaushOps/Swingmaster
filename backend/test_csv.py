from main import get_stocks_from_sheet, fetch_daily_data

in_s, us_s = get_stocks_from_sheet()
print(f"IN Stocks: {in_s}")
print(f"US Stocks: {us_s}")

if us_s:
    df = fetch_daily_data(us_s[0], 2)
    print(f"{us_s[0]} dataframe length: {len(df)}")

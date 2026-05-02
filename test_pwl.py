import sys
sys.path.append('Swingmaster-3.2/backend')
import main, pandas as pd
try:
    df = main.fetch_daily_data('PWL.NS', years=2)
    print('Length:', len(df))
    if len(df) < 100:
        print('Skipping due to length')
        sys.exit(0)
    df = main.add_features(df)
    df = main.create_labels(df)
    print('After labels:', len(df))
    model = main.IntradayModel()
    model.train(df[:-1])
    df['prob_up_wf'] = model.predict_proba_walk_forward(df)
    df['prob_up_insample'] = model.predict_proba(df)
    df.loc[df.index[-1], 'prob_up'] = float(df['prob_up_insample'].iloc[-1])
    print('Success')
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
    import traceback
    traceback.print_exc()

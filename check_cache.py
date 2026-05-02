import sys
sys.path.insert(0, '/app')
import main

print('HC historical after boot:', len(main.HC_CACHE['historical']))
print('NSE historical after boot:', len(main.GLOBAL_BUY_CACHE['historical']))
if main.HC_CACHE['historical']:
    print('Sample HC entry:', main.HC_CACHE['historical'][0])

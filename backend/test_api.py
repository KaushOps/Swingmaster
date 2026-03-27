import sys
import logging

logging.basicConfig(level=logging.INFO)

try:
    from main import scan_markets
    import time
    
    print("Imports successful, starting scan")
    start = time.time()
    res = scan_markets()
    print(f"Scan finished in {time.time()-start:.2f}s")
    print(f"Got {len(res['data'])} results")
except Exception as e:
    print(f"Error during test: {e}")

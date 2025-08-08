from datetime import datetime, timedelta
import random

def generate_signals():
    base_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    symbols = ["BTCUSDT","ETHUSDT","XAUUSD","EURUSD","BIST:THYAO"]
    out = []
    for i in range(20):
        t = base_time - timedelta(hours=19-i)
        sym = random.choice(symbols)
        side = random.choice(["long","short","flat"])
        price = round(random.uniform(10, 1000), 2)
        conf = round(random.uniform(0.5, 0.95), 2)
        if side == "flat":
            entry = stop = tp = None
        else:
            entry = price
            stop  = round(price * (0.98 if side=="long" else 1.02), 2)
            tp    = round(price * (1.03 if side=="long" else 0.97), 2)
        out.append({
            "timestamp": t.isoformat()+"Z",
            "symbol": sym,
            "side": side,
            "entry": entry,
            "stop": stop,
            "tp": tp,
            "confidence": conf
        })
    return out

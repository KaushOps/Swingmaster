"""
LLM Analyst — Groq + OpenRouter Integration
============================================
Uses Groq (primary, ~100ms) for real-time signal rationale and
OpenRouter (fallback / deep analysis) for complex market commentary.

Roles in SwingMaster:
  1. Signal Rationale    — "Why is this a BUY signal?" per-stock narrative
  2. Regime Commentary   — Daily market context summary
  3. Trade Post-Mortem   — After a trade closes, explain what worked/failed
  4. Gate Suggestions    — After a losing streak, recommend gate tightening
"""

import os
import json
import logging
import hashlib
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import requests

logger = logging.getLogger("llm_analyst")

# ─── Config ───────────────────────────────────────────────────────────────────
# Round-robin key rotation — reads GROQ_API_KEY_1..5 and OPENROUTER_API_KEY_1..2
# Falls back to legacy GROQ_API_KEY / OPENROUTER_API_KEY if numbered keys absent

def _load_keys(prefix: str, count: int, legacy_env: str) -> list:
    """Load numbered keys (PREFIX_1 .. PREFIX_N), fall back to legacy single key."""
    keys = []
    for i in range(1, count + 1):
        k = os.getenv(f"{prefix}_{i}", "").strip()
        if k:
            keys.append(k)
    if not keys:
        single = os.getenv(legacy_env, "").strip()
        if single:
            keys.append(single)
    return keys

_GROQ_KEYS      = _load_keys("GROQ_API_KEY",      5, "GROQ_API_KEY")
_OPENROUTER_KEYS = _load_keys("OPENROUTER_API_KEY", 2, "OPENROUTER_API_KEY")

# Atomic counters for round-robin rotation
import itertools
_groq_cycle = itertools.cycle(range(len(_GROQ_KEYS)))      if _GROQ_KEYS      else None
_or_cycle   = itertools.cycle(range(len(_OPENROUTER_KEYS))) if _OPENROUTER_KEYS else None
_groq_lock  = __import__('threading').Lock()
_or_lock    = __import__('threading').Lock()

GROQ_URL         = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"

GROQ_MODEL       = os.getenv("GROQ_MODEL",       "llama-3.3-70b-versatile")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3-haiku")

LLM_RATIONALE_ENABLED   = os.getenv("LLM_SIGNAL_RATIONALE",  "true").lower() == "true"
LLM_COMMENTARY_ENABLED  = os.getenv("LLM_REGIME_COMMENTARY", "true").lower() == "true"
LLM_POSTMORTEM_ENABLED  = os.getenv("LLM_POSTMORTEM",        "true").lower() == "true"

# Simple disk cache to avoid redundant LLM calls for the same signal
_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "llm_cache")
os.makedirs(_CACHE_DIR, exist_ok=True)

_RATIONALE_CACHE: Dict[str, Dict] = {}   # in-memory cache: {cache_key: {text, ts}}
CACHE_TTL_HOURS = 6                       # rationale stale after 6 hours


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _cache_key(prompt: str) -> str:
    return hashlib.md5(prompt.encode()).hexdigest()[:16]


def _load_disk_cache(key: str) -> Optional[str]:
    path = os.path.join(_CACHE_DIR, f"{key}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            data = json.load(f)
        age_hours = (time.time() - data.get("ts", 0)) / 3600
        if age_hours < CACHE_TTL_HOURS:
            return data.get("text")
    except Exception:
        pass
    return None


def _save_disk_cache(key: str, text: str):
    path = os.path.join(_CACHE_DIR, f"{key}.json")
    try:
        with open(path, "w") as f:
            json.dump({"text": text, "ts": time.time()}, f)
    except Exception:
        pass


def _call_groq(system: str, user: str, max_tokens: int = 300) -> Optional[str]:
    """Try all Groq keys in round-robin until one succeeds or all fail."""
    if not _GROQ_KEYS:
        return None
    for _ in range(len(_GROQ_KEYS)):
        with _groq_lock:
            idx = next(_groq_cycle)
        key = _GROQ_KEYS[idx]
        try:
            resp = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                },
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            if resp.status_code == 429:
                logger.warning(f"Groq key [{idx+1}] rate-limited, rotating...")
                continue  # try next key
            logger.warning(f"Groq key [{idx+1}] error {resp.status_code}")
        except Exception as e:
            logger.warning(f"Groq key [{idx+1}] exception: {e}")
    return None


def _call_openrouter(system: str, user: str, max_tokens: int = 400) -> Optional[str]:
    """Try all OpenRouter keys in round-robin until one succeeds."""
    if not _OPENROUTER_KEYS:
        return None
    for _ in range(len(_OPENROUTER_KEYS)):
        with _or_lock:
            idx = next(_or_cycle)
        key = _OPENROUTER_KEYS[idx]
        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://omniquant.duckdns.org",
                    "X-Title": "SwingMaster OmniQuant",
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            if resp.status_code == 429:
                logger.warning(f"OpenRouter key [{idx+1}] rate-limited, rotating...")
                continue
            logger.warning(f"OpenRouter key [{idx+1}] error {resp.status_code}")
        except Exception as e:
            logger.warning(f"OpenRouter key [{idx+1}] exception: {e}")
    return None


def _llm(system: str, user: str, max_tokens: int = 300, use_cache: bool = True) -> str:
    """
    Calls Groq first, falls back to OpenRouter.
    Returns empty string if both fail (non-fatal — LLM is enhancement only).
    """
    cache_key = _cache_key(system + user)

    if use_cache:
        cached = _load_disk_cache(cache_key)
        if cached:
            return cached

    result = _call_groq(system, user, max_tokens)
    if not result:
        result = _call_openrouter(system, user, max_tokens)
    if not result:
        result = ""

    if result and use_cache:
        _save_disk_cache(cache_key, result)

    return result


# ─── System Prompts ────────────────────────────────────────────────────────────

_SIGNAL_SYSTEM = """You are a concise NSE swing trade analyst. You analyse technical signals for Indian equity swing trades (3-15 day holds).
Given a stock's technical indicators and ML confidence, write a 2-3 sentence rationale for why it is a BUY signal.
Be specific about which indicators are the strongest drivers. Use plain English, no markdown, no bullet points.
Always mention the key risk. Keep response under 80 words."""

_REGIME_SYSTEM = """You are a macro market analyst for Indian equities (NSE/BSE).
Given the current regime, VIX, sector trends and Nifty position, write a 3-4 sentence daily market context.
Be concise and actionable. Mention which sectors to favour and which to avoid in current conditions.
No markdown. Under 100 words."""

_POSTMORTEM_SYSTEM = """You are a quantitative trading performance analyst.
Given a closed trade's entry indicators and outcome (win/loss), write a 2-3 sentence post-mortem.
Identify which indicator gave the correct signal and which gave a false signal (if loss).
This will be used to improve future model training. Under 80 words. No markdown."""

_GATE_SYSTEM = """You are a risk manager for an algorithmic swing trading system targeting NSE stocks.
Given recent performance statistics, recommend specific changes to signal quality gates (RSI range, ADX minimum, probability threshold).
Be precise with numbers. Output JSON only: {"rsi_min": int, "rsi_max": int, "adx_min": int, "prob_threshold": float}"""

_LEARNING_SYSTEM = """You are a machine learning advisor for a trading system.
Given a batch of recently closed trades with their features and outcomes, identify 2-3 patterns that predict wins vs losses.
Focus on: regime, RSI range, ADX strength, volume ratio, MACD direction.
Output plain text, under 120 words. Be specific about thresholds."""


# ─── Public API ───────────────────────────────────────────────────────────────

def get_signal_rationale(
    symbol: str,
    indicators: Dict[str, Any],
    confidence: float,
    regime: str = "UNKNOWN",
    shap_top: List[Dict] = None,
) -> str:
    """
    Generate a human-readable rationale for a BUY signal.

    Args:
        symbol:     Stock ticker (e.g. "RELIANCE")
        indicators: Dict of latest indicator values (rsi, macd_hist, adx, etc.)
        confidence: ML probability 0-100
        regime:     Current market regime ('TRENDING', 'CHOPPY', 'VOLATILE')
        shap_top:   Top SHAP features [{"feature": name, "importance": val}, ...]

    Returns:
        Rationale string (empty if LLM unavailable)
    """
    shap_str = ""
    if shap_top:
        shap_str = f" Top model drivers: {', '.join(f['feature'] for f in shap_top[:3])}."

    user = (
        f"Stock: {symbol} | Regime: {regime} | ML Confidence: {confidence:.1f}%\n"
        f"RSI: {indicators.get('rsi', 'N/A')} | MACD Hist: {indicators.get('macd_hist', 'N/A'):.4f} | "
        f"ADX: {indicators.get('adx', 'N/A')} | Volume Ratio: {indicators.get('volume_ratio', 'N/A'):.2f} | "
        f"Above EMA20: {indicators.get('above_ema20', 'N/A')} | BB%: {indicators.get('bb_pct', 'N/A'):.2f} | "
        f"Stoch K: {indicators.get('stoch_k', 'N/A'):.1f}.{shap_str}\n"
        f"Generate the BUY signal rationale."
    )
    return _llm(_SIGNAL_SYSTEM, user, max_tokens=150)


def get_regime_commentary(
    regime: str,
    nifty_pct_from_ema: float,
    india_vix: float,
    trending_sectors: List[Dict],
    signal_count: int,
    win_rate_recent: float,
) -> str:
    """
    Generate daily market context summary.

    Args:
        regime:             'TRENDING', 'CHOPPY', or 'VOLATILE'
        nifty_pct_from_ema: How far Nifty is from its 50-day EMA (%)
        india_vix:          Current India VIX value
        trending_sectors:   List of {sector, change_pct} dicts
        signal_count:       Number of BUY signals generated today
        win_rate_recent:    Recent 20-trade win rate (0-1)
    """
    top_sectors = ", ".join(
        f"{s['sector']} ({s['change_pct']:+.1f}%)"
        for s in sorted(trending_sectors, key=lambda x: x.get("change_pct", 0), reverse=True)[:3]
    ) if trending_sectors else "N/A"

    user = (
        f"Market Regime: {regime} | India VIX: {india_vix:.1f} | "
        f"Nifty vs EMA50: {nifty_pct_from_ema:+.2f}%\n"
        f"Top Sectors Today: {top_sectors}\n"
        f"Signals Generated: {signal_count} | Recent Win Rate: {win_rate_recent*100:.1f}%\n"
        f"Write today's market context."
    )
    return _llm(_REGIME_SYSTEM, user, max_tokens=200, use_cache=False)


def get_trade_postmortem(
    symbol: str,
    outcome: str,          # "WIN" or "LOSS"
    entry_indicators: Dict[str, Any],
    days_held: int,
    entry_price: float,
    exit_price: float,
    regime_at_entry: str = "UNKNOWN",
) -> str:
    """
    Generate post-mortem analysis for a closed trade.
    Called by OutcomeTracker after a trade closes.
    """
    pnl_pct = ((exit_price - entry_price) / entry_price) * 100
    user = (
        f"Symbol: {symbol} | Outcome: {outcome} | Days Held: {days_held} | "
        f"P&L: {pnl_pct:+.1f}% | Regime at Entry: {regime_at_entry}\n"
        f"Entry Indicators — RSI: {entry_indicators.get('rsi', 'N/A')} | "
        f"MACD Hist: {entry_indicators.get('macd_hist', 'N/A')} | "
        f"ADX: {entry_indicators.get('adx', 'N/A')} | "
        f"Volume Ratio: {entry_indicators.get('volume_ratio', 'N/A')} | "
        f"Confidence: {entry_indicators.get('confidence', 'N/A')}%\n"
        f"Write the trade post-mortem."
    )
    return _llm(_POSTMORTEM_SYSTEM, user, max_tokens=150, use_cache=False)


def get_gate_suggestions(
    win_rate: float,
    avg_confidence: float,
    losing_rsi_avg: float,
    losing_adx_avg: float,
    current_gates: Dict,
) -> Dict:
    """
    After poor performance, ask LLM to suggest tighter gates.
    Returns dict with new gate values, or current_gates if LLM fails.
    """
    user = (
        f"Current win rate: {win_rate*100:.1f}% | Avg confidence on losses: {avg_confidence:.1f}%\n"
        f"Average RSI on losing trades: {losing_rsi_avg:.1f} | "
        f"Average ADX on losing trades: {losing_adx_avg:.1f}\n"
        f"Current gates: {json.dumps(current_gates)}\n"
        f"Suggest improved gate values as JSON."
    )
    raw = _llm(_GATE_SYSTEM, user, max_tokens=100, use_cache=False)
    if raw:
        try:
            # Extract JSON from response
            start = raw.find("{")
            end   = raw.rfind("}") + 1
            if start >= 0 and end > start:
                return {**current_gates, **json.loads(raw[start:end])}
        except Exception as e:
            logger.warning(f"Gate suggestion JSON parse failed: {e}")
    return current_gates


def get_learning_insights(closed_trades: List[Dict]) -> str:
    """
    Given a batch of recent closed trades (with features + outcomes),
    ask the LLM to identify win/loss patterns for the human operator.
    """
    if not closed_trades:
        return ""

    # Summarize the batch for the LLM
    wins   = [t for t in closed_trades if t.get("outcome") == 1]
    losses = [t for t in closed_trades if t.get("outcome") == 0]

    def avg(lst, key):
        vals = [t.get(key) for t in lst if t.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else "N/A"

    summary = (
        f"Total trades: {len(closed_trades)} | Wins: {len(wins)} | Losses: {len(losses)}\n"
        f"WIN averages  — Confidence: {avg(wins, 'confidence')} | Volume Ratio: {avg(wins, 'volume_ratio')} | "
        f"ADX: {avg(wins, 'adx')} | RSI: {avg(wins, 'rsi')}\n"
        f"LOSS averages — Confidence: {avg(losses, 'confidence')} | Volume Ratio: {avg(losses, 'volume_ratio')} | "
        f"ADX: {avg(losses, 'adx')} | RSI: {avg(losses, 'rsi')}\n"
    )

    return _llm(_LEARNING_SYSTEM, summary, max_tokens=200, use_cache=False)


def health_check() -> Dict:
    """Returns connectivity status for Groq and OpenRouter."""
    return {
        "groq_configured":        len(_GROQ_KEYS) > 0,
        "groq_key_count":         len(_GROQ_KEYS),
        "groq_model":             GROQ_MODEL,
        "openrouter_configured":  len(_OPENROUTER_KEYS) > 0,
        "openrouter_key_count":   len(_OPENROUTER_KEYS),
        "openrouter_model":       OPENROUTER_MODEL,
        "rationale_enabled":      LLM_RATIONALE_ENABLED,
        "commentary_enabled":     LLM_COMMENTARY_ENABLED,
        "postmortem_enabled":     LLM_POSTMORTEM_ENABLED,
        "cache_dir":              _CACHE_DIR,
    }

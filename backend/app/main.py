"""
Gold Analysis Core - Main Application Entry Point
黃金價格多維度決策輔助系統
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
import uvicorn
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""

    app_name: str = "Gold Analysis Core"
    app_version: str = "0.1.0"
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"]

    class Config:
        env_file = ".env"


settings = Settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="黃金價格多維度決策輔助系統 - 核心功能",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SQLite helper ─────────────────────────────────────────────────────────────

DB_FILE = os.path.expanduser("~/.qclaw/gold_monitor_pro.db")

def _get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


# ── API Routes (SQLite mock mode) ────────────────────────────────────────────

@app.get("/api/prices/current")
async def get_current_price():
    """獲取黃金即時價格（從 SQLite 讀取）"""
    conn = _get_db()
    try:
        row = conn.execute(
            "SELECT local_sell, local_buy, timestamp, source_time "
            "FROM price_history WHERE metal='gold' ORDER BY timestamp DESC LIMIT 1"
        ).fetchone()
        if not row:
            return {"sell": 0, "buy": 0, "sell_twd": 0, "buy_twd": 0,
                    "timestamp": "", "change": 0, "change_pct": 0}

        sell = row["local_sell"]
        buy = row["local_buy"]
        ts = row["timestamp"]

        # 計算相對前一天收盤的變動
        prev = conn.execute(
            "SELECT local_sell FROM price_history "
            "WHERE metal='gold' AND local_sell != local_buy "
            "ORDER BY timestamp DESC LIMIT 1 OFFSET 1"
        ).fetchone()
        prev_sell = prev["local_sell"] if prev else sell
        change = sell - prev_sell
        change_pct = (change / prev_sell * 100) if prev_sell else 0

        return {
            "sell": sell,
            "buy": buy,
            "sell_twd": sell,
            "buy_twd": buy,
            "timestamp": ts,
            "change": round(change, 1),
            "change_pct": round(change_pct, 2),
        }
    finally:
        conn.close()


@app.get("/api/prices/history")
async def get_price_history(days: int = 7):
    """獲取歷史價格"""
    conn = _get_db()
    try:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        rows = conn.execute(
            "SELECT local_sell AS sell, local_buy AS buy, timestamp "
            "FROM price_history WHERE metal='gold' AND timestamp >= ? "
            "ORDER BY timestamp ASC",
            (cutoff,)
        ).fetchall()
        data = [{"timestamp": r["timestamp"], "sell": r["sell"], "buy": r["buy"]} for r in rows]
        return {"data": data, "count": len(data)}
    finally:
        conn.close()


@app.get("/api/decisions/recommend")
async def get_decision_recommend():
    """AI 決策推薦（mock，基於 RSI 簡單邏輯）"""
    conn = _get_db()
    try:
        rows = conn.execute(
            "SELECT local_sell FROM price_history "
            "WHERE metal='gold' ORDER BY timestamp DESC LIMIT 15"
        ).fetchall()
        prices = [r["local_sell"] for r in reversed(rows)]

        action = "hold"
        confidence = 0.5
        signal = "觀望"
        reasons = ["數據不足，無法給出明確建議"]

        if len(prices) >= 10:
            # 簡易 RSI
            gains, losses = 0, 0
            for i in range(-14, 0):
                diff = prices[i] - prices[i - 1] if i >= 1 else 0
                if diff > 0:
                    gains += diff
                else:
                    losses += abs(diff)
            period = min(14, len(prices) - 1)
            avg_gain = gains / period
            avg_loss = losses / period
            rsi = 100 - (100 / (1 + avg_gain / avg_loss)) if avg_loss else 100

            # 簡易 MA
            ma5 = sum(prices[-5:]) / 5
            ma10 = sum(prices[-10:]) / 10

            if rsi < 30 and ma5 < ma10:
                action = "buy"
                confidence = 0.7
                signal = "偏多 - RSI 超賣區"
                reasons = [f"RSI {rsi:.1f} 處超賣區", f"均線空头排列，可能反彈"]
            elif rsi > 70 and ma5 > ma10:
                action = "sell"
                confidence = 0.7
                signal = "偏空 - RSI 超買區"
                reasons = [f"RSI {rsi:.1f} 處超買區", f"均線多头排列，可能回調"]
            else:
                action = "hold"
                confidence = 0.6
                signal = "中性"
                reasons = [f"RSI {rsi:.1f} 中性區間", f"MA5={ma5:.0f} MA10={ma10:.0f}"]

        return {
            "action": action,
            "confidence": confidence,
            "signal": signal,
            "reason": reasons,
            "price": prices[-1] if prices else 0,
            "timestamp": datetime.utcnow().isoformat(),
        }
    finally:
        conn.close()


# ── System endpoints ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "mode": "sqlite-mock",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "mode": "sqlite-mock"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# ── Technical Analysis API ─────────────────────────────────────────────────

@app.get("/api/technicals")
async def get_technicals(symbol: str = "TAIFEX-TGF1", timeframe: str = "1D"):
    """
    技術分析：整合 RSI/MACD/MA/Bollinger/Patterns
    timeframe: 1m, 5m, 15m, 1H, 4H, 1D
    """
    from .agents.technical_analysis import TechnicalAnalysisAgent

    # 從 SQLite 取最近歷史價格（拿夠 60 根）
    conn = _get_db()
    try:
        rows = conn.execute(
            "SELECT local_sell FROM price_history "
            "WHERE metal='gold' ORDER BY timestamp DESC LIMIT 200"
        ).fetchall()
    finally:
        conn.close()

    if len(rows) < 60:
        return {"error": "數據不足", "available": len(rows), "required": 60}

    # 轉成 closes（由新到舊 → 由舊到新）
    closes = [float(r["local_sell"]) for r in reversed(rows)]

    # 呼叫 TechnicalAnalysisAgent
    agent = TechnicalAnalysisAgent()
    result = await agent.analyze({
        "prices": closes,
        "symbol": symbol,
        "timeframe": timeframe,
    })

    return result


# ── Forward Curve API ─────────────────────────────────────────────────────────

from app.routers.forward_curve import get_forward_curve_data, ContractPoint, ForwardCurveResponse

@app.get("/api/forward-curve", response_model=ForwardCurveResponse)
async def forward_curve():
    """
    遠期曲線 API
    回傳黃金期貨各月合約價格結構（Contango / Backwardation 分析）
    """
    return await get_forward_curve_data()

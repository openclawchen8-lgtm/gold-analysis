/**
 * Analysis 頁面 - 市場分析（AI 決策雷達）
 * 資料來源：/api/prices/current（台銀報價）+ /api/historical-prices（60天歷史）
 * + /api/technicals（AI recommendation）
 */
import React, { useEffect, useState } from 'react';
import { fetchCurrentPrice, fetchTechnicals, fetchHistory } from '@services/api';

interface IndicatorCardProps {
  title: string;
  value: string;
  sub?: string;
  color: 'green' | 'red' | 'yellow' | 'blue';
  icon: string;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ title, value, sub, color, icon }) => {
  const colorMap = {
    green: 'text-green-400 border-green-700 bg-green-900/20',
    red: 'text-red-400 border-red-700 bg-red-900/20',
    yellow: 'text-yellow-400 border-yellow-700 bg-yellow-900/20',
    blue: 'text-blue-400 border-blue-700 bg-blue-900/20',
  };
  return (
    <div className={`rounded-lg p-4 border ${colorMap[color]}`}>
      <div className="text-xs text-gray-400 mb-1">{icon} {title}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
};

const Analysis: React.FC = () => {
  const [price, setPrice] = useState<{ sell: number; buy: number; change: number; change_pct: number } | null>(null);
  const [technicals, setTechnicals] = useState<{
    recommendation: string;
    trend_score: number;
    risk_level: string;
    signals: Array<{ type: string; action: string; label: string }>;
  } | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: string; sell: number; buy: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [priceData, techData, histData] = await Promise.all([
        fetchCurrentPrice(),
        fetchTechnicals(),
        fetchHistory(60), // 60天歷史支撐 MA20/MA60
      ]);
      setPrice(priceData);
      setTechnicals(techData);
      setHistory(histData.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Simple technical indicators
  const calcSMA = (arr: number[], period: number) => {
    if (arr.length < period) return null;
    const slice = arr.slice(-period);
    return slice.reduce((s, v) => s + v, 0) / period;
  };

  const calcRSI = (arr: number[], period = 14) => {
    if (arr.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - period; i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };

  const prices = history.map(h => h.sell);
  const ma7 = calcSMA(prices, 7);
  const ma20 = calcSMA(prices, Math.min(20, prices.length));
  const ma25 = calcSMA(prices, Math.min(25, prices.length));
  const rsi14 = calcRSI(prices);
  const currentSell = price?.sell ?? 0;

  const trend = ma7 && ma25 ? (ma7 > ma25 ? '上升' : '下降') : '震盪';
  const trendColor = trend === '上升' ? 'green' : trend === '下降' ? 'red' : 'yellow';
  const rsiVal = rsi14 ?? 0;
  const rsiColor = rsiVal > 70 ? 'red' : rsiVal < 30 ? 'green' : 'yellow';
  const rsiDesc = rsiVal > 70 ? '超買' : rsiVal < 30 ? '超賣' : '中性';

  const volatility = prices.length >= 2
    ? (Math.max(...prices) - Math.min(...prices)) / (prices.reduce((s, v) => s + v, 0) / prices.length) * 100
    : 0;

  const level =
    currentSell >= 5000 ? '極高風險區' :
    currentSell >= 4800 ? '高風險區' :
    currentSell >= 4600 ? '中性區' :
    currentSell >= 4400 ? '低風險區' : '極低風險區';

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🔍 市場分析</h1>
          <p className="text-gray-400 text-sm mt-0.5">台銀報價 · AI 決策建議 · MA 趨勢 · RSI 超買超賣</p>
        </div>
        <button onClick={load} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">🔄 重新整理</button>
      </div>

      {loading && <div className="text-gray-400 text-center py-8 animate-pulse">分析中...</div>}
      {error && <div className="bg-red-900/30 text-red-400 p-3 rounded">⚠️ {error}</div>}

      {/* Decision / Technicals recommendation */}
      {technicals && (
        <div className={`rounded-lg p-4 border ${
          technicals.recommendation.toLowerCase().includes('buy') ? 'bg-green-900/20 border-green-700' :
          technicals.recommendation.toLowerCase().includes('sell') ? 'bg-red-900/20 border-red-700' :
          'bg-yellow-900/20 border-yellow-700'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{
              technicals.recommendation.toLowerCase().includes('buy') ? '💰' :
              technicals.recommendation.toLowerCase().includes('sell') ? '⚠️' : '➡️'
            }</span>
            <div>
              <div className={`text-xl font-bold ${
                technicals.recommendation.toLowerCase().includes('buy') ? 'text-green-400' :
                technicals.recommendation.toLowerCase().includes('sell') ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {technicals.recommendation}
              </div>
              <div className="text-sm text-gray-400">
                趨勢分數 {technicals.trend_score}/100 · 風險等級 {technicals.risk_level}
              </div>
            </div>
          </div>
          {technicals.signals.length > 0 && (
            <div className="mt-2 text-sm text-gray-300 space-y-1">
              {technicals.signals.slice(0, 4).map((s, i) => (
                <div key={i}>
                  <span className={s.action === 'buy' ? 'text-green-400' : s.action === 'sell' ? 'text-red-400' : 'text-yellow-400'}>
                    {s.action === 'buy' ? '▲' : s.action === 'sell' ? '▼' : '─'}
                  </span>{' '}
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Technical indicators grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IndicatorCard title="收盤價" value={currentSell > 0 ? `$${currentSell.toLocaleString()}` : '--'} icon="💵" color="blue" />
        <IndicatorCard title="7日均線 MA7" value={ma7 ? `$${ma7.toFixed(1)}` : '--'} icon="📊" color={ma7 && currentSell > ma7 ? 'green' : 'red'} />
        <IndicatorCard title="25日均線 MA25" value={ma25 ? `$${ma25.toFixed(1)}` : '--'} icon="📈" color={ma25 && currentSell > ma25 ? 'green' : 'red'} />
        <IndicatorCard title="RSI(14)" value={rsi14 ? rsi14.toFixed(1) : '--'} sub={rsi14 ? rsiDesc : ''} icon="⚡" color={rsiColor as 'green' | 'red' | 'yellow'} />
        <IndicatorCard title="MA 交叉" value={ma7 && ma25 ? (ma7 > ma25 ? '多頭 ▲' : '空頭 ▼') : '--'} icon="✂️" color={ma7 && ma25 ? (ma7 > ma25 ? 'green' : 'red') : 'yellow'} />
        <IndicatorCard title="趨勢方向" value={trend} icon="➡️" color={trendColor as 'green' | 'red' | 'yellow'} />
        <IndicatorCard title="日波動率" value={volatility > 0 ? `${volatility.toFixed(2)}%` : '--'} sub={volatility > 3 ? '高波動' : '正常'} icon="🌊" color={volatility > 3 ? 'red' : volatility > 1 ? 'yellow' : 'blue'} />
        <IndicatorCard title="價格區間" value={level} icon="🎯" color={level.includes('極高') || level.includes('高風') ? 'red' : level.includes('低') ? 'green' : 'yellow'} />
      </div>

      {/* Market structure */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">📐 市場結構分析</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">支撐位</div>
            <div className="text-green-400 font-bold">$4,500</div>
          </div>
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">阻力位</div>
            <div className="text-red-400 font-bold">$5,000</div>
          </div>
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">日內區間</div>
            <div className="text-yellow-400 font-bold">
              {price ? `$${price.change >= 0 ? '+' : ''}${price.change.toFixed(1)} (${price.change_pct.toFixed(2)}%)` : '--'}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">MA 排列</div>
            <div className="text-blue-400 font-bold">
              {ma7 && ma25 ? (ma7 > ma25 ? '多頭排列 ▲▲' : '空頭排列 ▼▼') : '資料不足'}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">交易區間</div>
            <div className="text-white font-bold">{level}</div>
          </div>
          <div className="bg-slate-700/50 rounded p-3">
            <div className="text-gray-400 text-xs">資料筆數</div>
            <div className="text-gray-300 font-bold">{history.length} 筆</div>
          </div>
        </div>
      </div>

      {/* Reasons breakdown */}
      {technicals && technicals.signals.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">🧠 AI 訊號分析</h3>
          <ul className="space-y-2">
            {technicals.signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className={`mt-0.5 ${
                  s.action === 'buy' ? 'text-green-400' : s.action === 'sell' ? 'text-red-400' : 'text-yellow-400'
                }`}>▸</span>
                <span className={s.action === 'buy' ? 'text-green-300' : s.action === 'sell' ? 'text-red-300' : 'text-yellow-300'}>
                  [{s.action.toUpperCase()}]
                </span>{' '}
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Analysis;

/**
 * Chart 頁面 - 完整 K線圖 + 技術指標
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
} from 'lightweight-charts';
import { fetchHistory, fetchCurrentPrice } from '@services/api';

interface ChartPoint {
  timestamp: string;
  sell: number;
  buy: number;
}

const Chart: React.FC = () => {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [price, setPrice] = useState<{ sell: number; buy: number } | null>(null);
  const candlestickRef = useRef<HTMLDivElement>(null);
  const ma5Ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const ma5ChartRef = useRef<IChartApi | null>(null);

  const calcMA = (pts: ChartPoint[], period: number) => {
    return pts.map((_, i) => {
      if (i < period - 1) return null;
      const slice = pts.slice(i - period + 1, i + 1);
      const avg = slice.reduce((s, p) => s + p.sell, 0) / period;
      return { time: pts[i].timestamp, value: avg };
    }).filter(Boolean) as { time: string; value: number }[];
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histData, priceData] = await Promise.all([
        fetchHistory(days),
        fetchCurrentPrice(),
      ]);
      setData(histData.data);
      setPrice({ sell: priceData.sell, buy: priceData.buy });
    } catch (e: any) {
      setError(e?.message ?? '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  // Draw candlestick chart
  useEffect(() => {
    if (!candlestickRef.current || data.length === 0) return;
    const container = candlestickRef.current;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 380,
      layout: { background: { color: '#1e293b' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
      crosshair: { mode: 1, vertLine: { color: '#f59e0b', width: 1, style: 2 }, horzLine: { color: '#f59e0b', width: 1, style: 2 } },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: Math.floor(new Date(d.timestamp).getTime() / 1000) as Time,
      open: d.sell,
      high: Math.max(d.sell, d.buy),
      low: Math.min(d.sell, d.buy),
      close: d.buy,
    }));

    candlestickSeries.setData(candleData);

    // MA5 line
    const ma5Data = calcMA(data, 5);
    if (ma5Data.length > 0) {
      const ma5Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'MA5' });
      ma5Series.setData(
        ma5Data.map((d) => ({ time: Math.floor(new Date(d.time).getTime() / 1000) as Time, value: d.value }))
      );
    }

    // MA20 line
    const ma20Data = calcMA(data, Math.min(20, data.length));
    if (ma20Data.length > 0) {
      const ma20Series = chart.addLineSeries({ color: '#a855f7', lineWidth: 1, title: 'MA20' });
      ma20Series.setData(
        ma20Data.map((d) => ({ time: Math.floor(new Date(d.time).getTime() / 1000) as Time, value: d.value }))
      );
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartRef.current && candlestickRef.current) {
        chartRef.current.applyOptions({ width: candlestickRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [data]);

  const formatTs = (ts: string) => {
    try { return new Date(ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">📈 黃金走勢圖</h2>
          <p className="text-gray-400 text-sm">K線圖 + 均線分析（MA5 / MA20）</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex gap-2 text-sm">
            {[3, 7, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded ${days === d ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}>
                {d}天
              </button>
            ))}
          </div>
          <button onClick={load} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Price summary */}
      {price && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-gray-400 text-xs">台灣銀行賣出</div>
            <div className="text-2xl font-bold text-white">${price.sell.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-gray-400 text-xs">台灣銀行買進</div>
            <div className="text-2xl font-bold text-white">${price.buy.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block" />MA5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block" />MA20</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 inline-block" />K線(上漲)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 inline-block" />K線(下跌)</span>
      </div>

      {loading && <div className="text-gray-400 text-center py-8 animate-pulse">載入圖表...</div>}
      {error && <div className="bg-red-900/30 text-red-400 p-3 rounded">⚠️ {error}</div>}

      {/* Candlestick chart */}
      <div className="bg-slate-800 rounded-lg overflow-hidden" ref={candlestickRef} style={{ height: 400 }} />

      {/* Stats table */}
      {data.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">📊 近期報價（最近10筆）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-slate-700">
                  <th className="text-left py-2">時間</th>
                  <th className="text-right py-2">賣出</th>
                  <th className="text-right py-2">買進</th>
                  <th className="text-right py-2">價差</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).reverse().map((d, i) => (
                  <tr key={i} className="text-white border-b border-slate-700/50">
                    <td className="py-2">{formatTs(d.timestamp)}</td>
                    <td className="text-right text-green-400">${d.sell.toLocaleString()}</td>
                    <td className="text-right text-red-400">${d.buy.toLocaleString()}</td>
                    <td className="text-right text-gray-400">{(d.sell - d.buy).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;

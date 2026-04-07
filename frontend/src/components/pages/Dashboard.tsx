/**
 * Dashboard 頁面
 */
import React from 'react';
import { useGoldStore } from '@stores/useGoldStore';
import { formatPrice, formatPercent } from '@utils';
import type { CandlestickData } from '@types';

const Dashboard: React.FC = () => {
  const { currentPrice, priceHistory } = useGoldStore();
  
  // 計算價格變動
  const priceChange = priceHistory.length >= 2 
    ? priceHistory[priceHistory.length - 1].price - priceHistory[0].price
    : 0;
  const percentChange = priceHistory.length >= 2 && priceHistory[0].price > 0
    ? ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price) * 100
    : 0;

  // 模擬 K 線數據（正式環境從 API 獲取）
  const mockCandleData: CandlestickData[] = [];

  return (
    <div className="space-y-6">
      {/* 價格卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
          <div className="text-gray-400 text-sm mb-1">Current Price</div>
          <div className="text-3xl font-bold text-white">
            ${currentPrice > 0 ? formatPrice(currentPrice) : '--'}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
          <div className="text-gray-400 text-sm mb-1">24h Change</div>
          <div className={`text-3xl font-bold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {priceChange !== 0 ? `${priceChange >= 0 ? '+' : ''}${formatPrice(priceChange)}` : '--'}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
          <div className="text-gray-400 text-sm mb-1">Change %</div>
          <div className={`text-3xl font-bold ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {percentChange !== 0 ? formatPercent(percentChange) : '--'}
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
        <div className="text-lg font-semibold text-white mb-4">Price Chart</div>
        <div className="text-gray-400 text-center py-12">
          Chart component will be integrated here (T014)
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

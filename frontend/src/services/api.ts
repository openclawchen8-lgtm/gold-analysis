/**
 * Gold Analysis API 服務層 - MVP 版本
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '',
  timeout: 10000,
});

// ── 價格 API ────────────────────────────────────────────────────────────────
export interface PriceResponse {
  sell: number;
  buy: number;
  sell_twd: number;
  buy_twd: number;
  timestamp: string;
  change: number;
  change_pct: number;
}

export interface HistoryPoint {
  timestamp: string;
  sell: number;
  buy: number;
}

export interface HistoryResponse {
  data: HistoryPoint[];
  count: number;
}

// ── 決策 API ────────────────────────────────────────────────────────────────
export interface DecisionResponse {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  signal: string;
  reason: string[];
  price: number;
  timestamp: string;
}

export const fetchCurrentPrice = async (): Promise<PriceResponse> => {
  const resp = await api.get<PriceResponse>('/api/prices/current');
  return resp.data;
};

export const fetchHistory = async (days = 7): Promise<HistoryResponse> => {
  const resp = await api.get<HistoryResponse>(`/api/prices/history?days=${days}`);
  return resp.data;
};

export const fetchDecision = async (): Promise<DecisionResponse> => {
  const resp = await api.get<DecisionResponse>('/api/decisions/recommend');
  return resp.data;
};

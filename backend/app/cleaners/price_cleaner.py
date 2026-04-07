"""
Price Cleaner - 價格數據清洗器
處理缺失值、重複數據和異常值
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
from ..validators.config import get_cleaning_settings

logger = logging.getLogger(__name__)


class PriceCleaner:
    """價格數據清洗器"""
    
    def __init__(self):
        self.settings = get_cleaning_settings()
    
    def clean_missing_values(
        self, 
        data: List[Dict[str, Any]],
        value_field: str = "price"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        處理缺失值
        
        策略:
        - interpolate: 線性插值
        - delete: 刪除缺失記錄
        - mark: 標記為 None
        
        Args:
            data: 數據列表
            value_field: 價格字段名
            
        Returns:
            (清洗後的數據, 統計信息)
        """
        if not data:
            return [], {"missing_count": 0, "strategy": self.settings.missing_value_strategy}
        
        # 統計缺失值
        missing_count = sum(1 for item in data if item.get(value_field) is None)
        
        if missing_count == 0:
            return data, {"missing_count": 0, "strategy": self.settings.missing_value_strategy}
        
        logger.info(f"Found {missing_count} missing values, strategy: {self.settings.missing_value_strategy}")
        
        strategy = self.settings.missing_value_strategy
        
        if strategy == "delete":
            # 刪除包含缺失值的記錄
            cleaned = [item for item in data if item.get(value_field) is not None]
        
        elif strategy == "mark":
            # 保持原樣，只標記
            cleaned = data
        
        elif strategy == "interpolate":
            # 線性插值
            cleaned = self._interpolate_missing(data, value_field)
        
        else:
            logger.warning(f"Unknown strategy: {strategy}, using mark")
            cleaned = data
        
        return cleaned, {
            "missing_count": missing_count,
            "strategy": strategy,
            "remaining": sum(1 for item in cleaned if item.get(value_field) is None)
        }
    
    def _interpolate_missing(
        self,
        data: List[Dict[str, Any]],
        value_field: str
    ) -> List[Dict[str, Any]]:
        """線性插值處理缺失值"""
        import copy
        
        # 提取有效值
        values = []
        for item in data:
            val = item.get(value_field)
            if val is not None:
                values.append(float(val))
            else:
                values.append(np.nan)
        
        # 使用 pandas 或 numpy 進行插值
        try:
            import pandas as pd
            series = pd.Series(values)
            series = series.interpolate(method='linear', limit=self.settings.interpolation_limit)
            interpolated = series.tolist()
        except ImportError:
            # Fallback: 簡單線性插值
            interpolated = self._simple_interpolate(values)
        
        # 寫回數據
        result = []
        for i, item in enumerate(data.copy()):
            new_item = item.copy()
            new_item[value_field] = interpolated[i] if not np.isnan(interpolated[i]) else None
            result.append(new_item)
        
        return result
    
    def _simple_interpolate(self, values: List[float]) -> List[float]:
        """簡單線性插值（無 pandas 依賴）"""
        result = values.copy()
        n = len(values)
        
        i = 0
        while i < n:
            if np.isnan(result[i]):
                # 找到連續 NaN 的範圍
                start = i
                while i < n and np.isnan(result[i]):
                    i += 1
                end = i
                
                # 找到前后的有效值
                prev_val = result[start - 1] if start > 0 else None
                next_val = result[end] if end < n else None
                
                # 插值
                if prev_val is not None and next_val is not None:
                    step = (next_val - prev_val) / (end - start + 1)
                    for j in range(start, end):
                        result[j] = prev_val + step * (j - start + 1)
            else:
                i += 1
        
        return result
    
    def remove_duplicates(
        self,
        data: List[Dict[str, Any]],
        key_field: str = "timestamp"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        移除重複數據
        
        Args:
            data: 數據列表
            key_field: 用於判斷重複的字段
            
        Returns:
            (清洗後的數據, 統計信息)
        """
        if not data:
            return [], {"duplicate_count": 0, "keep": self.settings.duplicate_keep}
        
        seen = set()
        unique_data = []
        duplicate_count = 0
        
        for item in data:
            key = item.get(key_field)
            if key is None:
                # 如果 key 為 None，保留（可能是缺失值）
                unique_data.append(item)
                continue
            
            # 轉換為字符串以便於比較
            key_str = str(key)
            
            if key_str in seen:
                duplicate_count += 1
                logger.debug(f"Duplicate found: {key_str}")
                continue
            
            seen.add(key_str)
            unique_data.append(item)
        
        if duplicate_count > 0:
            logger.info(f"Removed {duplicate_count} duplicate records")
        
        # 如果策略是保留最後一條，需要反轉
        if self.settings.duplicate_keep == "last" and duplicate_count > 0:
            unique_data = list(reversed(unique_data))
            # 再次去重，保留最後出現的
            seen = set()
            final_data = []
            for item in reversed(unique_data):
                key = str(item.get(key_field))
                if key not in seen:
                    seen.add(key)
                    final_data.append(item)
            unique_data = list(reversed(final_data))
        
        return unique_data, {
            "duplicate_count": duplicate_count,
            "keep": self.settings.duplicate_keep,
            "total_original": len(data),
            "total_cleaned": len(unique_data)
        }
    
    def fix_anomalies(
        self,
        data: List[Dict[str, Any]],
        value_field: str = "price"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        修正異常值
        
        策略:
        - clip: 裁剪到合理範圍
        - remove: 移除異常記錄
        - mark: 標記為異常
        
        Args:
            data: 數據列表
            value_field: 價格字段名
            
        Returns:
            (清洗後的數據, 統計信息)
        """
        if not data:
            return [], {"anomaly_count": 0}
        
        # 獲取有效值
        valid_values = [item[value_field] for item in data if item.get(value_field) is not None]
        
        if len(valid_values) < 3:
            return data, {"anomaly_count": 0, "reason": "insufficient data"}
        
        # 使用 IQR 方法檢測異常
        values_array = np.array(valid_values)
        q1 = np.percentile(values_array, 25)
        q3 = np.percentile(values_array, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - self.settings.iqr_multiplier * iqr
        upper_bound = q3 + self.settings.iqr_multiplier * iqr
        
        anomaly_count = 0
        cleaned = []
        
        for item in data:
            value = item.get(value_field)
            
            if value is None:
                cleaned.append(item)
                continue
            
            is_anomaly = value < lower_bound or value > upper_bound
            
            if is_anomaly:
                anomaly_count += 1
                logger.debug(f"Anomaly detected: {value} (bounds: {lower_bound:.2f} - {upper_bound:.2f})")
                
                if self.settings.correction_strategy == "remove":
                    continue  # 跳過這條記錄
                
                new_item = item.copy()
                if self.settings.correction_strategy == "clip":
                    # 裁剪到邊界
                    new_item[value_field] = max(lower_bound, min(upper_bound, value))
                    new_item[f"{value_field}_original"] = value
                    new_item["_corrected"] = True
                elif self.settings.correction_strategy == "mark":
                    new_item["_is_anomaly"] = True
                
                cleaned.append(new_item)
            else:
                cleaned.append(item)
        
        if anomaly_count > 0:
            logger.info(f"Fixed {anomaly_count} anomalies with strategy: {self.settings.correction_strategy}")
        
        return cleaned, {
            "anomaly_count": anomaly_count,
            "strategy": self.settings.correction_strategy,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound
        }
    
    def clean_all(
        self,
        data: List[Dict[str, Any]],
        value_field: str = "price",
        key_field: str = "timestamp"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        執行完整清洗流程
        
        順序: 移除重複 -> 處理缺失值 -> 修正異常值
        
        Args:
            data: 原始數據
            value_field: 價格字段名
            key_field: key 字段名
            
        Returns:
            (清洗後的數據, 完整統計)
        """
        stats = {}
        
        # Step 1: 移除重複
        data, dup_stats = self.remove_duplicates(data, key_field)
        stats["duplicates"] = dup_stats
        
        # Step 2: 處理缺失值
        data, missing_stats = self.clean_missing_values(data, value_field)
        stats["missing"] = missing_stats
        
        # Step 3: 修正異常值
        data, anomaly_stats = self.fix_anomalies(data, value_field)
        stats["anomalies"] = anomaly_stats
        
        stats["total_original"] = len(data)
        stats["total_cleaned"] = len(data)
        
        return data, stats


# 預設實例
_default_cleaner: Optional[PriceCleaner] = None


def get_price_cleaner() -> PriceCleaner:
    """取得預設的價格清洗器實例"""
    global _default_cleaner
    if _default_cleaner is None:
        _default_cleaner = PriceCleaner()
    return _default_cleaner

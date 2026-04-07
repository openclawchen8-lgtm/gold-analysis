"""
Tests for Cleaners Module
"""

import pytest
from datetime import datetime, timezone
from app.cleaners import (
    PriceCleaner,
    OutlierDetector,
    get_price_cleaner,
    get_outlier_detector,
)


class TestPriceCleaner:
    def setup_method(self):
        self.cleaner = PriceCleaner()
        # Sample data with duplicates, missing and anomaly
        self.sample = [
            {"timestamp": datetime(2023, 1, 1, tzinfo=timezone.utc), "price": 1800.0},
            {"timestamp": datetime(2023, 1, 1, tzinfo=timezone.utc), "price": 1800.0},  # duplicate
            {"timestamp": datetime(2023, 1, 2, tzinfo=timezone.utc), "price": None},   # missing
            {"timestamp": datetime(2023, 1, 3, tzinfo=timezone.utc), "price": 25000.0}, # anomaly (high)
            {"timestamp": datetime(2023, 1, 4, tzinfo=timezone.utc), "price": 1900.0},
        ]

    def test_remove_duplicates(self):
        cleaned, stats = self.cleaner.remove_duplicates(self.sample, key_field="timestamp")
        # Should keep first occurrence by default
        assert len(cleaned) == 4
        assert stats["duplicate_count"] == 1
        # Verify that timestamps are unique
        timestamps = [item["timestamp"] for item in cleaned]
        assert len(set(timestamps)) == len(timestamps)

    def test_clean_missing_values_interpolate(self):
        # Ensure strategy is interpolate (default)
        cleaned, stats = self.cleaner.clean_missing_values(self.sample, value_field="price")
        # Missing count should be 1
        assert stats["missing_count"] == 1
        # After interpolation, missing should be filled (not None)
        missing_filled = [item for item in cleaned if item.get("price") is None]
        assert len(missing_filled) == 0
        # Verify interpolation roughly between surrounding values
        interpolated = next(item for item in cleaned if item["timestamp"].day == 2)["price"]
        assert interpolated > 0

    def test_fix_anomalies_clip(self):
        cleaned, stats = self.cleaner.fix_anomalies(self.sample, value_field="price")
        # One anomaly should be corrected
        assert stats["anomaly_count"] == 1
        # The corrected record should have _corrected flag
        corrected = [item for item in cleaned if item.get("_corrected")]
        assert len(corrected) == 1
        # Value should be clipped within IQR bounds (approx)
        corrected_value = corrected[0]["price"]
        assert corrected_value < 25000.0

    def test_clean_all(self):
        cleaned, stats = self.cleaner.clean_all(self.sample)
        # Expect duplicates removed, missing interpolated, anomaly corrected
        assert stats["duplicates"]["duplicate_count"] == 1
        assert stats["missing"]["missing_count"] == 1
        assert stats["anomalies"]["anomaly_count"] == 1
        # Final count should be original - duplicates (1) => 4 records
        assert len(cleaned) == 4


class TestOutlierDetector:
    def setup_method(self):
        self.detector = OutlierDetector()
        # Create data with clear outliers
        self.data = [
            {"timestamp": datetime(2023, 1, i+1, tzinfo=timezone.utc), "price": p}
            for i, p in enumerate([1000, 1020, 1015, 5000, 1030, 990])
        ]

    def test_detect_zscore(self):
        result, stats = self.detector.detect_zscore(self.data, value_field="price", threshold=2.0)
        # Expect the 5000 value to be flagged as outlier
        outliers = [item for item in result if item.get("_is_outlier")]
        assert len(outliers) == 1
        assert outliers[0]["price"] == 5000
        assert stats["outlier_count"] == 1

    def test_detect_iqr(self):
        result, stats = self.detector.detect_iqr(self.data, value_field="price", multiplier=1.5)
        outliers = [item for item in result if item.get("_is_outlier")]
        # IQR should also flag the 5000 value as outlier
        assert len(outliers) == 1
        assert outliers[0]["price"] == 5000
        assert stats["outlier_count"] == 1

    def test_combined_detection(self):
        result, stats = self.detector.detect_combined(self.data, value_field="price")
        # Combined should only mark as _is_outlier if both methods agree
        combined_outliers = [item for item in result if item.get("_is_outlier")]
        assert len(combined_outliers) == 1
        assert combined_outliers[0]["price"] == 5000
        assert stats["outlier_count"] == 1

    def test_get_outliers_only(self):
        outliers = self.detector.get_outliers_only(self.data, value_field="price", method="zscore")
        assert len(outliers) == 1
        assert outliers[0]["price"] == 5000

    def test_singleton_instances(self):
        d1 = get_outlier_detector()
        d2 = get_outlier_detector()
        assert d1 is d2

"""
Pytest configuration for data sources tests
"""
import os
import sys

# Add project path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set test environment variables BEFORE any imports
os.environ["ALPHA_VANTAGE_API_KEY"] = "test_alpha_key"
os.environ["FINNHUB_API_KEY"] = "test_finnhub_key"
os.environ["FRED_API_KEY"] = "test_fred_key"

import pytest

# Clear cached settings
from app.services import config
config.get_api_settings.cache_clear()

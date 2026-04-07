-- init migration for gold_analysis DB
-- PostgreSQL schema for core entities

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    language VARCHAR(10) DEFAULT 'zh-TW',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    initial_capital DOUBLE PRECISION DEFAULT 0,
    current_value DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);

-- portfolio_holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_price DOUBLE PRECISION,
    market_value DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_holdings_asset ON portfolio_holdings(asset_type);

-- decisions table
CREATE TYPE decision_type AS ENUM ('buy','sell','hold','watch');
CREATE TYPE decision_source AS ENUM ('ai_analysis','technical','fundamental','sentiment','manual');

CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE SET NULL,
    decision_type decision_type NOT NULL,
    source decision_source NOT NULL,
    asset VARCHAR(20) NOT NULL DEFAULT 'GOLD',
    signal_strength DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    price_target DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    reason_zh TEXT,
    reason_en TEXT,
    indicators_snapshot TEXT,
    analysis_scores TEXT,
    is_executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_price DOUBLE PRECISION,
    model_version VARCHAR(50) DEFAULT 'v1',
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_user ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_portfolio ON decisions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_decisions_asset ON decisions(asset);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);

-- alerts table
CREATE TYPE alert_type AS ENUM ('price_above','price_below','indicator_cross','volume_spike');

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    asset VARCHAR(20) NOT NULL,
    target_price DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    triggered_at TIMESTAMP WITH TIME ZONE,
    metadata VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_asset ON alerts(asset);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_asset ON portfolio_holdings(portfolio_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_decisions_user_asset ON decisions(user_id, asset);

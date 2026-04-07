# Database Architecture Documentation

## Overview
The **gold‑analysis** platform relies on three data stores:

| Store      | Purpose                                    | Client Implementation |
|-----------|--------------------------------------------|-----------------------|
| PostgreSQL| Core relational data (users, portfolios, decisions, alerts, holdings) | SQLAlchemy (async) |
| InfluxDB  | Time‑series market data (price ticks, indicators) | `influxdb_client` |
| Redis     | Caching of frequently accessed data (session state, recent market snapshots) | `redis.asyncio` |

This document details the PostgreSQL schema, indexes, and foreign‑key constraints that are applied by the migration script `backend/app/migrations/001_init.sql`.

---

## Tables & Columns

### `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL PRIMARY KEY` | - | Auto‑generated user identifier |
| `username` | `VARCHAR(50)` | `UNIQUE, NOT NULL, INDEX` | Login name |
| `email` | `VARCHAR(255)` | `UNIQUE, NOT NULL, INDEX` | Email address |
| `hashed_password` | `VARCHAR(255)` | `NOT NULL` | Password hash |
| `display_name` | `VARCHAR(100)` | - | Optional display name |
| `avatar_url` | `VARCHAR(500)` | - | URL to avatar image |
| `bio` | `TEXT` | - | User biography |
| `timezone` | `VARCHAR(50)` | `DEFAULT 'Asia/Taipei'` | Preferred timezone |
| `language` | `VARCHAR(10)` | `DEFAULT 'zh-TW'` | UI language |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Account active flag |
| `is_verified` | `BOOLEAN` | `DEFAULT FALSE` | Email verified flag |
| `is_premium` | `BOOLEAN` | `DEFAULT FALSE` | Premium subscription flag |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp |
| `last_login` | `TIMESTAMPTZ` | - | Last login time |

### `portfolios`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL PRIMARY KEY` | - | Portfolio ID |
| `user_id` | `INTEGER` | `NOT NULL, REFERENCES users(id) ON DELETE CASCADE, INDEX` | Owner |
| `name` | `VARCHAR(100)` | `NOT NULL` | Portfolio name |
| `description` | `VARCHAR(500)` | - | Optional description |
| `initial_capital` | `DOUBLE PRECISION` | `DEFAULT 0` | Starting capital |
| `current_value` | `DOUBLE PRECISION` | `DEFAULT 0` | Current market value |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Update time |

### `portfolio_holdings`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL PRIMARY KEY` | - |
| `portfolio_id` | `INTEGER` | `NOT NULL, REFERENCES portfolios(id) ON DELETE CASCADE, INDEX` |
| `asset_type` | `VARCHAR(20)` | `NOT NULL` |
| `quantity` | `DOUBLE PRECISION` | `NOT NULL, DEFAULT 0` |
| `avg_cost` | `DOUBLE PRECISION` | `NOT NULL, DEFAULT 0` |
| `current_price` | `DOUBLE PRECISION` | - |
| `market_value` | `DOUBLE PRECISION` | - |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |

### `decisions`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL PRIMARY KEY` | - |
| `user_id` | `INTEGER` | `NOT NULL, REFERENCES users(id) ON DELETE CASCADE, INDEX` |
| `portfolio_id` | `INTEGER` | `REFERENCES portfolios(id) ON DELETE SET NULL, INDEX` |
| `decision_type` | `decision_type ENUM` | `NOT NULL` |
| `source` | `decision_source ENUM` | `NOT NULL` |
| `asset` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'GOLD', INDEX` |
| `signal_strength` | `DOUBLE PRECISION` | `NOT NULL` |
| `confidence` | `DOUBLE PRECISION` | `NOT NULL` |
| `price_target` | `DOUBLE PRECISION` | - |
| `stop_loss` | `DOUBLE PRECISION` | - |
| `reason_zh` | `TEXT` | - |
| `reason_en` | `TEXT` | - |
| `indicators_snapshot` | `TEXT` | - |
| `analysis_scores` | `TEXT` | - |
| `is_executed` | `BOOLEAN` | `DEFAULT FALSE` |
| `executed_at` | `TIMESTAMPTZ` | - |
| `execution_price` | `DOUBLE PRECISION` | - |
| `model_version` | `VARCHAR(50)` | `DEFAULT 'v1'` |
| `metadata` | `TEXT` | - |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW(), INDEX` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |

### `alerts`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `SERIAL PRIMARY KEY` | - |
| `user_id` | `INTEGER` | `NOT NULL, REFERENCES users(id) ON DELETE CASCADE, INDEX` |
| `alert_type` | `alert_type ENUM` | `NOT NULL` |
| `asset` | `VARCHAR(20)` | `NOT NULL` |
| `target_price` | `DOUBLE PRECISION` | `NOT NULL` |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` |
| `triggered_at` | `TIMESTAMPTZ` | - |
| `metadata` | `VARCHAR(500)` | - |

---

## Indexes & Performance
The migration adds a set of indexes aimed at the most common query patterns:

* `idx_users_username`, `idx_users_email` – fast lookup for authentication.
* `idx_portfolios_user` – fetch all portfolios for a user.
* `idx_holdings_portfolio`, `idx_holdings_asset` – retrieve holdings by portfolio or asset.
* `idx_decisions_user`, `idx_decisions_portfolio`, `idx_decisions_asset`, `idx_decisions_created` – filter decisions by owner, portfolio, asset, and creation time.
* `idx_alerts_user`, `idx_alerts_asset` – locate a user’s alerts quickly.
* Composite indexes (`idx_holdings_portfolio_asset`, `idx_decisions_user_asset`) – support queries that join on both foreign key and asset, e.g. *"all GOLD holdings for user X"*.

---

## Usage Example (SQLAlchemy)
```python
from backend.app.db.config import get_db_session
from backend.app.models import User, Portfolio

async def create_demo_user():
    async for session in get_db_session():
        user = User(username="demo", email="demo@example.com", hashed_password="hash")
        session.add(user)
        await session.commit()
        return user
```

---

## Migration Execution
Run the async migration during application start‑up:
```bash
python -c "import asyncio; from backend.app.db.config import init_all_databases; asyncio.run(init_all_databases())"
```
The script `backend/app/migrations/001_init.sql` is applied automatically by Alembic‑style tooling (if configured) or can be executed manually via `psql`.

---

## Future Extensions
* Add `ENUM` for asset types if the set expands beyond `GOLD`.
* Introduce a `strategy` table to store algorithmic trading strategies.
* Add `PARTITION BY RANGE` on `decisions.created_at` for massive historical data.

---

*Last updated: 2026‑04‑07*
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT, password_salt TEXT,
 telegram_id TEXT UNIQUE, telegram_username TEXT, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id); CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS beats (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, genre TEXT, bpm INTEGER CHECK(bpm IS NULL OR (bpm BETWEEN 1 AND 300)), key TEXT,
 duration TEXT, description TEXT, cover_path TEXT, cover_url TEXT, preview_path TEXT, preview_url TEXT,
 wav_path TEXT, stems_path TEXT, min_price INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_beats_status_date ON beats(status,created_at DESC); CREATE INDEX IF NOT EXISTS idx_beats_genre ON beats(genre); CREATE INDEX IF NOT EXISTS idx_beats_title ON beats(title);
CREATE TABLE IF NOT EXISTS licenses (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0), currency TEXT NOT NULL DEFAULT 'RUB',
 cover_path TEXT, cover_url TEXT, file_formats TEXT NOT NULL DEFAULT 'MP3', description TEXT NOT NULL DEFAULT '', terms_json TEXT NOT NULL DEFAULT '[]',
 commercial_rights TEXT NOT NULL DEFAULT '', restrictions TEXT NOT NULL DEFAULT '', additional_terms TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS beat_licenses (beat_id TEXT NOT NULL REFERENCES beats(id), license_id TEXT NOT NULL REFERENCES licenses(id), PRIMARY KEY(beat_id,license_id));
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
 total_price INTEGER NOT NULL CHECK(total_price >= 0), currency TEXT NOT NULL DEFAULT 'RUB', note TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), paid_at TEXT, confirmed_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON orders(user_id,created_at DESC); CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status,created_at DESC);
CREATE TABLE IF NOT EXISTS order_items (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), beat_id TEXT REFERENCES beats(id) ON DELETE SET NULL,
 license_id TEXT REFERENCES licenses(id) ON DELETE SET NULL, beat_title_snapshot TEXT NOT NULL, license_name_snapshot TEXT NOT NULL,
 price_snapshot INTEGER NOT NULL, currency_snapshot TEXT NOT NULL, license_terms_snapshot TEXT NOT NULL, file_formats_snapshot TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS purchases (
 id TEXT PRIMARY KEY, order_item_id TEXT NOT NULL UNIQUE REFERENCES order_items(id), user_id TEXT NOT NULL REFERENCES users(id),
 beat_id TEXT REFERENCES beats(id) ON DELETE SET NULL, granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id,granted_at DESC);
CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS admin_logs (
 id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, action TEXT NOT NULL, object_type TEXT, object_id TEXT,
 result TEXT NOT NULL DEFAULT 'success', details_json TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_date ON admin_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO site_settings(key,value_json) VALUES ('about','{"name":"Racks4L","description":"Авторские биты для артистов, которые ищут собственный звук.","genres":["TRAP","DRILL","UNDERGROUND"],"socials":{}}');

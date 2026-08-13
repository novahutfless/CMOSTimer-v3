PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS data_store (
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'session', 'solve', 'settings', 'stats_config', 'goal', 'plugin'
  item_id TEXT NOT NULL, -- UUID or 'MAIN' for singletons like settings
  payload TEXT NOT NULL, -- JSON Data
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, type, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  username TEXT,
  email TEXT,
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_operations (
  user_id INTEGER NOT NULL,
  operation_id TEXT NOT NULL,
  processed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, operation_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_fragments (
  user_id INTEGER NOT NULL,
  transfer_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (user_id, transfer_id, chunk_index),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_tombstones (
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, type, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_action_ip_time
  ON auth_attempts(action, ip, created_at);

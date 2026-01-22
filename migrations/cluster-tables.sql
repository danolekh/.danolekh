-- Cluster workflow message storage tables
-- Run with: wrangler d1 execute danolekh-db --remote --file=migrations/cluster-tables.sql

CREATE TABLE IF NOT EXISTS cluster_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cluster_messages (
  id TEXT PRIMARY KEY,
  shard_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  request_id TEXT,
  primary_key TEXT,
  headers TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS cluster_messages_shard_lookup
  ON cluster_messages(shard_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS cluster_messages_request_id_lookup
  ON cluster_messages(request_id);

CREATE TABLE IF NOT EXISTS cluster_replies (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  headers TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS cluster_replies_request_lookup
  ON cluster_replies(request_id);

CREATE TABLE IF NOT EXISTS cluster_runners (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

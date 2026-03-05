import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
export const db = new Database(dbPath);

export function migrate() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL CHECK(direction IN ('ASSET','LIABILITY')),
      name TEXT NOT NULL,
      parent_id TEXT NULL,
      level INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_leaf INTEGER NOT NULL DEFAULT 1,
      path_ids TEXT NOT NULL,
      path_names TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(parent_id) REFERENCES categories(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_sibling
    ON categories(parent_id, direction, name);

    CREATE INDEX IF NOT EXISTS idx_categories_direction ON categories(direction);

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      snapshot_time TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      total_assets TEXT NOT NULL,
      total_liabilities TEXT NOT NULL,
      net_worth TEXT NOT NULL,
      note TEXT NULL,
      client_request_id TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_client_request_id
    ON snapshots(client_request_id)
    WHERE client_request_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_snapshots_time ON snapshots(snapshot_time);

    CREATE TABLE IF NOT EXISTS snapshot_items (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('ASSET','LIABILITY')),
      item_name TEXT NOT NULL,
      amount TEXT NOT NULL,
      item_type TEXT NOT NULL,
      category_id TEXT NULL,
      category_path TEXT NULL,
      note TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_items_snapshot ON snapshot_items(snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_items_direction ON snapshot_items(direction);
    CREATE INDEX IF NOT EXISTS idx_items_category ON snapshot_items(category_id);
  `);
}

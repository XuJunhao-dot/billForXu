import express from 'express';
import cors from 'cors';
import { db, migrate } from './db';
import { CreateCategory, CreateSnapshot } from './types';
import { nowIso, uuid, parseMoneyToCents, centsToMoney } from './utils';

migrate();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// --- Categories ---
app.get('/api/categories', (req, res) => {
  const direction = req.query.direction as string;
  if (direction !== 'ASSET' && direction !== 'LIABILITY') {
    return res.status(400).json({ error: 'direction must be ASSET or LIABILITY' });
  }
  const rows = db
    .prepare(
      `SELECT id, direction, name, parent_id as parentId, level, sort_order as sortOrder,
              is_leaf as isLeaf, path_ids as pathIds, path_names as pathNames
       FROM categories
       WHERE direction = ?
       ORDER BY level ASC, sort_order ASC, name ASC`
    )
    .all(direction);
  res.json(rows);
});

app.post('/api/categories', (req, res) => {
  const parsed = CreateCategory.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { direction, name, parentId = null, sortOrder } = parsed.data;

  let level = 1;
  let pathIds = 'root';
  let pathNames = direction === 'ASSET' ? '资产' : '负债';

  if (parentId) {
    const parent = db
      .prepare('SELECT id, level, path_ids as pathIds, path_names as pathNames FROM categories WHERE id=?')
      .get(parentId) as any;
    if (!parent) return res.status(404).json({ error: 'parent not found' });
    level = parent.level + 1;
    if (level > 4) return res.status(400).json({ error: 'max category depth is 4' });
    pathIds = `${parent.pathIds}/${uuid()}`;
    pathNames = `${parent.pathNames}/${name}`;

    // parent becomes non-leaf
    db.prepare('UPDATE categories SET is_leaf=0, updated_at=? WHERE id=?').run(nowIso(), parentId);
  } else {
    pathIds = `root/${uuid()}`;
    pathNames = `${pathNames}/${name}`;
  }

  const id = uuid();
  const t = nowIso();
  try {
    db.prepare(
      `INSERT INTO categories (id, direction, name, parent_id, level, sort_order, is_leaf, path_ids, path_names, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, direction, name, parentId, level, sortOrder, 1, pathIds, pathNames, t, t);
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'insert failed' });
  }

  res.json({ id });
});

// --- Snapshots ---
app.get('/api/snapshots', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, snapshot_time as snapshotTime, currency, total_assets as totalAssets,
              total_liabilities as totalLiabilities, net_worth as netWorth, note
       FROM snapshots
       ORDER BY snapshot_time DESC`
    )
    .all();
  res.json(rows);
});

app.get('/api/snapshots/latest', (_req, res) => {
  const snap = db
    .prepare(
      `SELECT id, snapshot_time as snapshotTime, currency, total_assets as totalAssets,
              total_liabilities as totalLiabilities, net_worth as netWorth, note
       FROM snapshots
       ORDER BY snapshot_time DESC
       LIMIT 1`
    )
    .get() as any;
  if (!snap) return res.json(null);
  const items = db
    .prepare(
      `SELECT id, direction, item_name as itemName, amount, item_type as itemType,
              category_id as categoryId, category_path as categoryPath, note
       FROM snapshot_items WHERE snapshot_id=?`
    )
    .all(snap.id);
  res.json({ ...snap, items });
});

app.get('/api/snapshots/:id', (req, res) => {
  const id = req.params.id;
  const snap = db
    .prepare(
      `SELECT id, snapshot_time as snapshotTime, currency, total_assets as totalAssets,
              total_liabilities as totalLiabilities, net_worth as netWorth, note
       FROM snapshots
       WHERE id=?`
    )
    .get(id) as any;
  if (!snap) return res.status(404).json({ error: 'not found' });
  const items = db
    .prepare(
      `SELECT id, direction, item_name as itemName, amount, item_type as itemType,
              category_id as categoryId, category_path as categoryPath, note
       FROM snapshot_items WHERE snapshot_id=?`
    )
    .all(id);
  res.json({ ...snap, items });
});

app.post('/api/snapshots', (req, res) => {
  const parsed = CreateSnapshot.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { snapshotTime, currency, note, items } = parsed.data;

  // Calculate totals in cents
  let assets = 0n;
  let liabilities = 0n;
  for (const it of items) {
    const cents = parseMoneyToCents(it.amount);
    if (it.direction === 'ASSET') assets += cents;
    else liabilities += cents;
  }
  const net = assets - liabilities;

  const snapshotId = uuid();
  const t = nowIso();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO snapshots (id, snapshot_time, currency, total_assets, total_liabilities, net_worth, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(snapshotId, snapshotTime, currency, centsToMoney(assets), centsToMoney(liabilities), centsToMoney(net), note ?? null, t, t);

    const itemStmt = db.prepare(
      `INSERT INTO snapshot_items (id, snapshot_id, direction, item_name, amount, item_type, category_id, category_path, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const it of items) {
      const itemId = uuid();
      let categoryPath: string | null = null;
      if (it.categoryId) {
        const cat = db.prepare('SELECT path_names as pathNames FROM categories WHERE id=?').get(it.categoryId) as any;
        categoryPath = cat?.pathNames ?? null;
      }
      itemStmt.run(
        itemId,
        snapshotId,
        it.direction,
        it.itemName,
        it.amount,
        it.itemType,
        it.categoryId ?? null,
        categoryPath,
        it.note ?? null,
        t,
        t
      );
    }
  });

  try {
    tx();
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'insert failed' });
  }

  res.json({ id: snapshotId });
});

// Trends: simple net worth series from snapshots
app.get('/api/trends/net-worth', (req, res) => {
  const from = (req.query.from as string) ?? null;
  const to = (req.query.to as string) ?? null;

  let sql = `SELECT snapshot_time as date, total_assets as assets, total_liabilities as liabilities, net_worth as netWorth, currency
             FROM snapshots`;
  const where: string[] = [];
  const params: any[] = [];
  if (from) {
    where.push('snapshot_time >= ?');
    params.push(from);
  }
  if (to) {
    where.push('snapshot_time <= ?');
    params.push(to);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY snapshot_time ASC';

  const rows = db.prepare(sql).all(...params) as any[];
  const currency = rows[0]?.currency ?? 'CNY';
  res.json({ from, to, currency, series: rows.map(r => ({ date: r.date, assets: r.assets, liabilities: r.liabilities, netWorth: r.netWorth })) });
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

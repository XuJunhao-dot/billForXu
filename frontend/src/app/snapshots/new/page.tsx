'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Item = {
  id?: string;
  direction: 'ASSET' | 'LIABILITY';
  itemName: string;
  amount: string;
  itemType: string;
  categoryId?: string | null;
  note?: string | null;
};

type LatestSnapshot = {
  id: string;
  snapshotTime: string;
  currency: string;
  items: {
    id: string;
    direction: 'ASSET' | 'LIABILITY';
    itemName: string;
    amount: string;
    itemType: string;
    categoryId: string | null;
    note: string | null;
  }[];
} | null;

type Category = {
  id: string;
  direction: 'ASSET' | 'LIABILITY';
  pathNames: string;
  isLeaf: 0 | 1;
};

export default function NewSnapshotPage() {
  const { data: latest } = useSWR<LatestSnapshot>('/api/snapshots/latest', apiGet);
  const { data: catsAsset } = useSWR<Category[]>('/api/categories?direction=ASSET', apiGet);
  const { data: catsLiability } = useSWR<Category[]>('/api/categories?direction=LIABILITY', apiGet);

  const [snapshotTime, setSnapshotTime] = useState<string>(() => new Date().toISOString());
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initialized = useMemo(() => items.length > 0, [items.length]);

  function initFromLatest() {
    if (!latest) {
      setItems([
        { direction: 'ASSET', itemName: '', amount: '0', itemType: 'CASH' },
        { direction: 'LIABILITY', itemName: '', amount: '0', itemType: 'CREDIT_CARD' }
      ]);
      return;
    }
    setItems(latest.items.map(it => ({
      direction: it.direction,
      itemName: it.itemName,
      amount: it.amount,
      itemType: it.itemType,
      categoryId: it.categoryId,
      note: it.note
    })));
  }

  const totals = useMemo(() => {
    let a = 0;
    let l = 0;
    for (const it of items) {
      const v = Number(it.amount);
      if (Number.isFinite(v)) {
        if (it.direction === 'ASSET') a += v;
        else l += v;
      }
    }
    return { assets: a, liabilities: l, net: a - l };
  }, [items]);

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        snapshotTime,
        currency: 'CNY',
        items: items
          .filter(it => it.itemName.trim() && it.amount.trim())
          .map(it => ({
            direction: it.direction,
            itemName: it.itemName,
            amount: it.amount,
            itemType: it.itemType,
            categoryId: it.categoryId ?? null,
            note: it.note ?? null
          }))
      };
      if (payload.items.length < 1) throw new Error('至少需要 1 条明细');
      await apiPost<{ id: string }>('/api/snapshots', payload);
      window.location.href = '/snapshots';
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem(direction: 'ASSET' | 'LIABILITY') {
    setItems(prev => prev.concat({ direction, itemName: '', amount: '0', itemType: direction === 'ASSET' ? 'CASH' : 'CREDIT_CARD' }));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const categoryOptions = (dir: 'ASSET' | 'LIABILITY') => {
    const list = dir === 'ASSET' ? (catsAsset ?? []) : (catsLiability ?? []);
    return list.filter(c => c.isLeaf === 1);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">新增快照</h1>
        <Link className="border rounded px-3 py-1 hover:bg-slate-50" href="/">返回</Link>
      </div>

      {!initialized ? (
        <div className="border rounded p-4 space-y-2">
          <div className="text-sm text-slate-600">第一次可全量手动录入；后续可从上一条快照复制再修改。</div>
          <button className="border rounded px-3 py-2 hover:bg-slate-50" onClick={initFromLatest}>
            {latest ? '从上一次快照复制' : '开始手动录入'}
          </button>
        </div>
      ) : null}

      <div className="border rounded p-4 space-y-3">
        <div className="font-medium">快照时间</div>
        <input className="border rounded px-3 py-2 w-full" value={snapshotTime} onChange={(e) => setSnapshotTime(e.target.value)} />
        <div className="text-xs text-slate-500">暂用 ISO 字符串；后续可换成日期选择器。</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="border rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">明细</div>
          <div className="text-sm text-slate-600">资产 {totals.assets.toFixed(2)} / 负债 {totals.liabilities.toFixed(2)} / 净 {totals.net.toFixed(2)}</div>
        </div>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="border rounded p-3 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <select className="border rounded px-2 py-1" value={it.direction} onChange={(e) => updateItem(idx, { direction: e.target.value as any })}>
                  <option value="ASSET">资产</option>
                  <option value="LIABILITY">负债</option>
                </select>
                <input className="border rounded px-2 py-1 flex-1 min-w-[140px]" placeholder="名称" value={it.itemName} onChange={(e) => updateItem(idx, { itemName: e.target.value })} />
                <input className="border rounded px-2 py-1 w-[120px]" placeholder="金额" value={it.amount} onChange={(e) => updateItem(idx, { amount: e.target.value })} />
                <input className="border rounded px-2 py-1 w-[140px]" placeholder="类型(枚举)" value={it.itemType} onChange={(e) => updateItem(idx, { itemType: e.target.value })} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className="border rounded px-2 py-1 flex-1 min-w-[220px]" value={it.categoryId ?? ''} onChange={(e) => updateItem(idx, { categoryId: e.target.value ? e.target.value : null })}>
                  <option value="">（未分类）</option>
                  {categoryOptions(it.direction).map((c) => (
                    <option key={c.id} value={c.id}>{c.pathNames}</option>
                  ))}
                </select>
                <input className="border rounded px-2 py-1 flex-1 min-w-[220px]" placeholder="备注" value={it.note ?? ''} onChange={(e) => updateItem(idx, { note: e.target.value })} />
                <button className="border rounded px-3 py-1 hover:bg-slate-50" onClick={() => removeItem(idx)}>删除</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button className="border rounded px-3 py-2 hover:bg-slate-50" onClick={() => addItem('ASSET')}>+ 资产</button>
          <button className="border rounded px-3 py-2 hover:bg-slate-50" onClick={() => addItem('LIABILITY')}>+ 负债</button>
        </div>
      </div>

      <div className="flex justify-end">
        <button disabled={saving} className="border rounded px-4 py-2 hover:bg-slate-50 disabled:opacity-50" onClick={onSave}>
          {saving ? '保存中...' : '保存快照'}
        </button>
      </div>
    </main>
  );
}

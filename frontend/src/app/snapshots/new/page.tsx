'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { uuidv4 } from '@/lib/id';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { SummaryBar } from '@/components/SummaryBar';
import { ASSET_TYPE_OPTIONS, LIABILITY_TYPE_OPTIONS, QUICK_ADD_ASSETS } from '@/lib/presets';

type Item = {
  id?: string;
  direction: 'ASSET' | 'LIABILITY';
  itemName: string;
  amount: string;
  itemType: string;
  categoryId?: string | null;
  note?: string | null;
};

const DEFAULT_ASSET_TYPE = 'CASH';
const DEFAULT_LIABILITY_TYPE = 'CREDIT_CARD';

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

  const [snapshotDate, setSnapshotDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [snapshotClock, setSnapshotClock] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const snapshotTime = useMemo(() => {
    // interpret as local time, store as ISO
    const dt = new Date(`${snapshotDate}T${snapshotClock}:00`);
    return dt.toISOString();
  }, [snapshotDate, snapshotClock]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initialized = useMemo(() => items.length > 0, [items.length]);

  function initFromLatest() {
    if (!latest) {
      setItems([
        { direction: 'ASSET', itemName: '', amount: '0', itemType: DEFAULT_ASSET_TYPE },
        { direction: 'LIABILITY', itemName: '', amount: '0', itemType: DEFAULT_LIABILITY_TYPE }
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
        clientRequestId: uuidv4(),
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

  function addItem(direction: 'ASSET' | 'LIABILITY', preset?: { itemName?: string; itemType?: string }) {
    setItems(prev =>
      prev.concat({
        direction,
        itemName: preset?.itemName ?? '',
        amount: '0',
        itemType: preset?.itemType ?? (direction === 'ASSET' ? DEFAULT_ASSET_TYPE : DEFAULT_LIABILITY_TYPE)
      })
    );
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const categoryOptions = (dir: 'ASSET' | 'LIABILITY') => {
    const list = dir === 'ASSET' ? (catsAsset ?? []) : (catsLiability ?? []);
    return list.filter(c => c.isLeaf === 1);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:py-8 space-y-4 pb-28">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900">新增快照</h1>
            <div className="text-xs text-slate-600 mt-1">首次全量录入；以后从上次复制再改金额即可。</div>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">返回</Button>
          </Link>
        </div>

        {!initialized ? (
          <Card>
            <CardHeader>
              <CardTitle>开始</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="primary" onClick={initFromLatest}>
                {latest ? '从上一次快照复制' : '开始手动录入'}
              </Button>
              <div className="text-xs text-slate-500">建议：先把常用项（现金/定期/固收/基金/ETF/股票/外汇）快速加进去。</div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>快照时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">日期</div>
                <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">时间</div>
                <Input type="time" value={snapshotClock} onChange={(e) => setSnapshotClock(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>明细</CardTitle>
              <div className="text-xs text-slate-600">支持预置类型快速录入</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_ADD_ASSETS.map((q) => (
                <Button key={q.itemName + q.itemType} size="sm" onClick={() => addItem('ASSET', { itemName: q.itemName, itemType: q.itemType })}>
                  + {q.itemName}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={() => addItem('LIABILITY')}>+ 负债</Button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const typeOptions = it.direction === 'ASSET' ? ASSET_TYPE_OPTIONS : LIABILITY_TYPE_OPTIONS;
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-2">
                        <Select value={it.direction} onValueChange={(v) => updateItem(idx, { direction: v as any, itemType: v === 'ASSET' ? DEFAULT_ASSET_TYPE : DEFAULT_LIABILITY_TYPE })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASSET">资产</SelectItem>
                            <SelectItem value="LIABILITY">负债</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-4">
                        <Input placeholder="名称（如：银行卡活期/ETF/股票）" value={it.itemName} onChange={(e) => updateItem(idx, { itemName: e.target.value })} />
                      </div>
                      <div className="sm:col-span-3">
                        <Input inputMode="decimal" placeholder="金额" value={it.amount} onChange={(e) => updateItem(idx, { amount: e.target.value })} />
                      </div>
                      <div className="sm:col-span-3">
                        <Select value={it.itemType} onValueChange={(v) => updateItem(idx, { itemType: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                          <SelectContent>
                            {typeOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-7">
                        <select
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          value={it.categoryId ?? ''}
                          onChange={(e) => updateItem(idx, { categoryId: e.target.value ? e.target.value : null })}
                        >
                          <option value="">（未分类）</option>
                          {categoryOptions(it.direction).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.pathNames}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <Input placeholder="备注（可选）" value={it.note ?? ''} onChange={(e) => updateItem(idx, { note: e.target.value })} />
                      </div>
                      <div className="sm:col-span-1 flex sm:justify-end">
                        <Button variant="ghost" className="text-rose-700" onClick={() => removeItem(idx)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 ? <div className="text-sm text-slate-500">还没有明细，先点上方的“+现金/定期/固收...”快速添加。</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <SummaryBar assets={totals.assets} liabilities={totals.liabilities} net={totals.net} onSave={onSave} saving={saving} />
    </main>
  );
}

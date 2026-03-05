'use client';

import Link from 'next/link';
import { use } from 'react';
import useSWR from 'swr';
import { apiGet } from '@/lib/api';
import { SketchDistribution } from '@/components/SketchDistribution';

type Item = {
  id: string;
  direction: 'ASSET' | 'LIABILITY';
  itemName: string;
  amount: string;
  itemType: string;
  categoryId: string | null;
  categoryPath: string | null;
  note: string | null;
};

type SnapshotDetail = {
  id: string;
  snapshotTime: string;
  currency: string;
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  note: string | null;
  items: Item[];
};

// Next.js sync dynamic APIs: params in client may be a Promise.
export default function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = typeof (params as any)?.then === 'function' ? use(params as Promise<{ id: string }>) : (params as { id: string });
  const { data, error, isLoading } = useSWR<SnapshotDetail>(`/api/snapshots/${id}`, apiGet);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">快照详情</h1>
        <Link className="border rounded px-3 py-1 hover:bg-slate-50" href="/snapshots">返回列表</Link>
      </div>

      {isLoading ? <div className="text-sm text-slate-500">加载中...</div> : null}
      {error ? <div className="text-sm text-red-600">{String(error)}</div> : null}

      {data ? (
        <>
          <div className="border rounded p-4">
            <div className="font-medium">{new Date(data.snapshotTime).toLocaleString()} <span className="text-sm text-slate-600">({data.currency})</span></div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
              <div>资产：<span className="font-medium">{data.totalAssets}</span></div>
              <div>负债：<span className="font-medium">{data.totalLiabilities}</span></div>
              <div>净资产：<span className="font-medium">{data.netWorth}</span></div>
            </div>
            {data.note ? <div className="text-sm text-slate-600 mt-2">备注：{data.note}</div> : null}
          </div>

          <div className="border rounded p-4 space-y-3">
            <div className="font-medium">明细</div>
            <SketchDistribution
              items={data.items.map((it) => ({
                direction: it.direction,
                amount: it.amount,
                itemName: it.itemName,
                itemType: it.itemType
              }))}
            />
            <div className="space-y-2">
              {data.items.map((it) => (
                <div key={it.id} className="border rounded p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium">{it.itemName}</div>
                    <div className="text-sm">{it.direction === 'ASSET' ? '资产' : '负债'}：<span className="font-semibold">{it.amount}</span></div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    类型：{it.itemType} {it.categoryPath ? ` | 分类：${it.categoryPath}` : ''}
                  </div>
                  {it.note ? <div className="text-xs text-slate-600 mt-1">备注：{it.note}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

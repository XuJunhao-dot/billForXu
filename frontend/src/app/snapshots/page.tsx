'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { apiGet } from '@/lib/api';

type Snapshot = {
  id: string;
  snapshotTime: string;
  currency: string;
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  note: string | null;
};

export default function SnapshotsPage() {
  const { data, error, isLoading } = useSWR<Snapshot[]>('/api/snapshots', apiGet);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">快照列表</h1>
        <Link className="border rounded px-3 py-1 hover:bg-slate-50" href="/snapshots/new">新增快照</Link>
      </div>

      {isLoading ? <div className="text-sm text-slate-500">加载中...</div> : null}
      {error ? <div className="text-sm text-red-600">{String(error)}</div> : null}

      <div className="space-y-2">
        {(data ?? []).map((s) => (
          <Link key={s.id} href={`/snapshots/${s.id}`} className="block border rounded p-4 hover:bg-slate-50">
            <div className="flex justify-between gap-2">
              <div className="font-medium">{new Date(s.snapshotTime).toLocaleString()}</div>
              <div className="text-sm text-slate-600">{s.currency}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
              <div>资产：<span className="font-medium">{s.totalAssets}</span></div>
              <div>负债：<span className="font-medium">{s.totalLiabilities}</span></div>
              <div>净资产：<span className="font-medium">{s.netWorth}</span></div>
            </div>
          </Link>
        ))}
        {data && data.length === 0 ? <div className="text-sm text-slate-500">暂无快照，先去新增一个。</div> : null}
      </div>
    </main>
  );
}

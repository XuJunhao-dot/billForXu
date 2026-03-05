'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import * as echarts from 'echarts';
import { apiGet } from '@/lib/api';

type TrendPoint = { date: string; assets: string; liabilities: string; netWorth: string };

type TrendResp = {
  from: string | null;
  to: string | null;
  currency: string;
  series: TrendPoint[];
};

export default function TrendsPage() {
  const { data, error, isLoading } = useSWR<TrendResp>('/api/trends/net-worth', apiGet);
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [metric, setMetric] = useState<'netWorth' | 'assets' | 'liabilities'>('netWorth');

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) chartRef.current = echarts.init(ref.current);
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const x = data.series.map(p => p.date);
    const y = data.series.map(p => Number(p[metric as keyof TrendPoint]));

    chartRef.current.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: x },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: y, smooth: true }],
      grid: { left: 40, right: 20, top: 20, bottom: 40 }
    });
  }, [data, metric]);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">趋势图</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded border ${metric === 'assets' ? 'bg-slate-100' : ''}`} onClick={() => setMetric('assets')}>资产</button>
          <button className={`px-3 py-1 rounded border ${metric === 'liabilities' ? 'bg-slate-100' : ''}`} onClick={() => setMetric('liabilities')}>负债</button>
          <button className={`px-3 py-1 rounded border ${metric === 'netWorth' ? 'bg-slate-100' : ''}`} onClick={() => setMetric('netWorth')}>净资产</button>
        </div>
      </div>

      {isLoading ? <div className="text-sm text-slate-500">加载中...</div> : null}
      {error ? <div className="text-sm text-red-600">{String(error)}</div> : null}

      <div className="border rounded p-4">
        <div className="text-sm text-slate-600 mb-2">数据源：按快照时间序列汇总（MVP）</div>
        <div ref={ref} style={{ width: '100%', height: 360 }} />
        {!data?.series?.length ? <div className="text-sm text-slate-500 mt-2">暂无数据</div> : null}
      </div>
    </main>
  );
}

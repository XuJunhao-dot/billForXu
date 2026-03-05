'use client';

import { useEffect, useMemo, useRef } from 'react';
import chartXkcd from 'chart.xkcd';

type Item = {
  direction: 'ASSET' | 'LIABILITY';
  amount: string;
  itemName: string;
  itemType: string;
};

function parseNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function SketchDistribution({ items }: { items: Item[] }) {
  const ref = useRef<SVGSVGElement | null>(null);

  const data = useMemo(() => {
    // Only show assets distribution for now (more intuitive)
    const assets = items.filter((i) => i.direction === 'ASSET');
    const byType = new Map<string, number>();
    for (const it of assets) {
      const key = it.itemType || 'OTHER_ASSET';
      byType.set(key, (byType.get(key) ?? 0) + parseNum(it.amount));
    }
    const labels = Array.from(byType.keys());
    const values = labels.map((k) => byType.get(k) ?? 0);
    const total = values.reduce((a, b) => a + b, 0);

    // keep top N, aggregate rest
    const pairs = labels.map((l, idx) => ({ label: l, value: values[idx] })).sort((a, b) => b.value - a.value);
    const top = pairs.slice(0, 6);
    const rest = pairs.slice(6);
    const restSum = rest.reduce((a, b) => a + b.value, 0);
    if (restSum > 0) top.push({ label: 'OTHER', value: restSum });

    return {
      labels: top.map((p) => p.label),
      values: top.map((p) => p.value),
      total
    };
  }, [items]);

  useEffect(() => {
    if (!ref.current) return;
    // clear previous
    while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);

    if (!data.total || data.labels.length === 0) return;

    // chart.xkcd needs a container element (svg)
    // eslint-disable-next-line new-cap
    new chartXkcd.Pie(ref.current, {
      title: '资产分布（按类型）',
      data: {
        labels: data.labels,
        datasets: [{ data: data.values }]
      },
      options: {
        innerRadius: 0.35,
        legendPosition: chartXkcd.config.positionType.upRight
      }
    });
  }, [data]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-sm font-semibold text-slate-900 mb-2">资金分布</div>
      <div className="text-xs text-slate-600 mb-2">当前快照的资产按“预置类型”分布（手绘风格）。</div>
      <div className="w-full overflow-x-auto">
        <svg ref={ref} style={{ minWidth: 520, width: '100%', height: 320 }} />
      </div>
      {!data.total ? <div className="text-sm text-slate-500">暂无资产数据</div> : null}
    </div>
  );
}

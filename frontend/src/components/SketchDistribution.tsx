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

function fmtMoney(n: number): string {
  return n.toFixed(2);
}

export function SketchDistribution({ items }: { items: Item[] }) {
  const ref = useRef<SVGSVGElement | null>(null);

  const data = useMemo(() => {
    // Only show assets distribution for now (more intuitive)
    const assets = items.filter((i) => i.direction === 'ASSET');

    // Group by asset name (what user recognizes)
    const byName = new Map<string, number>();
    for (const it of assets) {
      const key = (it.itemName || '').trim() || '未命名资产';
      byName.set(key, (byName.get(key) ?? 0) + parseNum(it.amount));
    }

    const pairs = Array.from(byName.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const top = pairs.slice(0, 8);
    const rest = pairs.slice(8);
    const restSum = rest.reduce((a, b) => a + b.value, 0);
    if (restSum > 0) top.push({ label: '其他', value: restSum });

    const total = top.reduce((a, b) => a + b.value, 0);

    return {
      pairs: top,
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

    // Make room for legend & avoid cropping: set explicit size.
    const container = ref.current.parentElement;
    const w = Math.max(720, container?.clientWidth ?? 720);
    const h = 420;
    ref.current.setAttribute('width', String(w));
    ref.current.setAttribute('height', String(h));

    // eslint-disable-next-line new-cap
    new chartXkcd.Pie(ref.current, {
      title: '资产分布',
      data: {
        labels: data.labels,
        datasets: [{ data: data.values }]
      },
      options: {
        innerRadius: 0.35,
        legendPosition: chartXkcd.config.positionType.upRight
      }
    });

    // Add simple hover tooltips (native title) with "amount + percent".
    // chart.xkcd renders SVG paths; we attach title to filled paths.
    const paths = Array.from(ref.current.querySelectorAll('path'))
      .filter((p) => {
        const fill = p.getAttribute('fill');
        return fill && fill !== 'none';
      });

    const total = data.total;
    for (let i = 0; i < Math.min(paths.length, data.pairs.length); i++) {
      const { label, value } = data.pairs[i];
      const percent = total > 0 ? (value / total) * 100 : 0;
      const title = `${label}\n金额：${fmtMoney(value)}\n占比：${percent.toFixed(1)}%`;

      // Remove old title if any
      const old = paths[i].querySelector('title');
      if (old) old.remove();
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = title;
      paths[i].appendChild(t);
    }
  }, [data]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-sm font-semibold text-slate-900 mb-2">资金分布</div>
      <div className="text-xs text-slate-600 mb-2">图例为“资产名称”，悬浮可看金额与占比（手绘风格）。</div>

      <div className="w-full overflow-x-auto">
        <svg ref={ref} style={{ minWidth: 720, width: '100%', height: 420, overflow: 'visible' }} />
      </div>

      {data.total ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {data.pairs.map((p) => {
            const percent = data.total > 0 ? (p.value / data.total) * 100 : 0;
            return (
              <div key={p.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="truncate mr-3" title={p.label}>{p.label}</div>
                <div className="text-slate-700 whitespace-nowrap">
                  {fmtMoney(p.value)}（{percent.toFixed(1)}%）
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-500">暂无资产数据</div>
      )}
    </div>
  );
}

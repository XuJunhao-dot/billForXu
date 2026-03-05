'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Category = {
  id: string;
  direction: 'ASSET' | 'LIABILITY';
  name: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isLeaf: 0 | 1;
  pathIds: string;
  pathNames: string;
};

function buildTree(categories: Category[]) {
  const byId = new Map<string, Category & { children: Category[] }>();
  for (const c of categories) byId.set(c.id, { ...c, children: [] });
  const roots: (Category & { children: Category[] })[] = [];
  for (const c of categories) {
    const node = byId.get(c.id)!;
    if (!c.parentId) roots.push(node);
    else {
      const parent = byId.get(c.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

function Tree({ nodes }: { nodes: (Category & { children: Category[] })[] }) {
  return (
    <ul className="pl-4 space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="text-sm">
            <span className="font-medium">{n.name}</span>{' '}
            <span className="text-slate-500">(lvl {n.level}{n.isLeaf ? ', leaf' : ''})</span>
          </div>
          {n.children.length > 0 ? <Tree nodes={n.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default function CategoriesPage() {
  const [direction, setDirection] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setError('');
    const data = await apiGet<Category[]>(`/api/categories?direction=${direction}`);
    setCats(data);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  const tree = useMemo(() => buildTree(cats), [cats]);

  async function onCreate() {
    setLoading(true);
    setError('');
    try {
      await apiPost('/api/categories', {
        direction,
        name,
        parentId: parentId ? parentId : null,
        sortOrder: 0
      });
      setName('');
      setParentId('');
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">分类管理</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded border ${direction === 'ASSET' ? 'bg-slate-100' : ''}`} onClick={() => setDirection('ASSET')}>资产</button>
          <button className={`px-3 py-1 rounded border ${direction === 'LIABILITY' ? 'bg-slate-100' : ''}`} onClick={() => setDirection('LIABILITY')}>负债</button>
        </div>
      </div>

      <div className="border rounded p-4 space-y-3">
        <div className="font-medium">新增分类</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className="border rounded px-3 py-2" placeholder="分类名称" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded px-3 py-2" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">（根分类）</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.pathNames}</option>
            ))}
          </select>
          <button disabled={loading || !name.trim()} className="border rounded px-3 py-2 hover:bg-slate-50 disabled:opacity-50" onClick={onCreate}>
            创建
          </button>
        </div>
        <div className="text-xs text-slate-500">MVP：仅实现“新增/查看”。重命名/移动/删除后续补。</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="border rounded p-4">
        <div className="font-medium mb-2">分类树</div>
        {tree.length ? <Tree nodes={tree as any} /> : <div className="text-sm text-slate-500">暂无分类</div>}
      </div>
    </main>
  );
}

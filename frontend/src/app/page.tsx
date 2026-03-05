import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">billForXu</h1>
      <p className="text-slate-600">单用户免登录：资产/负债快照 + 趋势图（MVP）。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link className="border rounded p-4 hover:bg-slate-50" href="/snapshots/new">
          <div className="font-medium">新增快照</div>
          <div className="text-sm text-slate-600">自动从上一次快照复制，修改后保存</div>
        </Link>
        <Link className="border rounded p-4 hover:bg-slate-50" href="/snapshots">
          <div className="font-medium">快照列表</div>
          <div className="text-sm text-slate-600">查看历史快照与明细</div>
        </Link>
        <Link className="border rounded p-4 hover:bg-slate-50" href="/trends">
          <div className="font-medium">趋势图</div>
          <div className="text-sm text-slate-600">总资产 / 总负债 / 净资产</div>
        </Link>
        <Link className="border rounded p-4 hover:bg-slate-50" href="/categories">
          <div className="font-medium">分类管理</div>
          <div className="text-sm text-slate-600">资产/负债多级分类</div>
        </Link>
      </div>

      <div className="text-sm text-slate-500">
        API 默认：<code className="bg-slate-100 px-1 rounded">http://localhost:8080</code>（可用环境变量 <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_API_BASE</code> 修改）
      </div>
    </main>
  );
}

'use client';

import { cn } from '@/lib/ui';
import { Button } from '@/components/ui/Button';

export function SummaryBar({
  assets,
  liabilities,
  net,
  onSave,
  saving
}: {
  assets: number;
  liabilities: number;
  net: number;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div className={cn('rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-lg')}
        >
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="text-xs sm:text-sm text-slate-700">
              <div className="flex gap-3 flex-wrap">
                <span>资产 <b>{assets.toFixed(2)}</b></span>
                <span>负债 <b>{liabilities.toFixed(2)}</b></span>
                <span>净资产 <b>{net.toFixed(2)}</b></span>
              </div>
            </div>
            <Button variant="primary" disabled={saving} onClick={onSave}>
              {saving ? '保存中…' : '保存快照'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

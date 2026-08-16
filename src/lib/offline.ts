import { supabase } from '@/lib/supabase';

export interface PendingOp {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'lmc_sync_queue';

function readQueue(): PendingOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(q: PendingOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueueOp(op: Omit<PendingOp, 'id' | 'timestamp'>) {
  const q = readQueue();
  q.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
  writeQueue(q);
  window.dispatchEvent(new Event('sync-queue-changed'));
}

export function getQueueLength(): number {
  return readQueue().length;
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const q = readQueue();
  if (q.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: PendingOp[] = [];

  for (const op of q) {
    try {
      let res;
      if (op.operation === 'insert') {
        res = await supabase.from(op.table).insert(op.payload);
      } else if (op.operation === 'update') {
        const { id, ...rest } = op.payload;
        res = await supabase.from(op.table).update(rest).eq('id', id);
      } else if (op.operation === 'delete') {
        res = await supabase.from(op.table).delete().eq('id', op.payload.id);
      }
      if (res?.error) throw res.error;
      synced++;
    } catch {
      failed++;
      remaining.push(op);
    }
  }

  writeQueue(remaining);
  window.dispatchEvent(new Event('sync-queue-changed'));
  return { synced, failed };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

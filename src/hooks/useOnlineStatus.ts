import { useEffect, useState } from 'react';
import { isOnline, getQueueLength, syncQueue } from '@/lib/offline';

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());
  const [queueLength, setQueueLength] = useState(getQueueLength());

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onQueue = () => setQueueLength(getQueueLength());

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('sync-queue-changed', onQueue);

    const interval = setInterval(() => {
      setQueueLength(getQueueLength());
      if (isOnline() && getQueueLength() > 0) {
        syncQueue();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('sync-queue-changed', onQueue);
      clearInterval(interval);
    };
  }, []);

  return { online, queueLength };
}

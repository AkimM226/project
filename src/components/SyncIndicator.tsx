import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function SyncIndicator() {
  const { online, queueLength } = useOnlineStatus();

  return (
    <div className="flex items-center gap-2 text-sm">
      {online ? (
        <span className="flex items-center gap-1 text-green-600">
          <Wifi className="w-4 h-4" />
          En ligne
        </span>
      ) : (
        <span className="flex items-center gap-1 text-orange-600">
          <WifiOff className="w-4 h-4" />
          Hors ligne
        </span>
      )}
      {queueLength > 0 && (
        <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {queueLength} en attente
        </span>
      )}
    </div>
  );
}

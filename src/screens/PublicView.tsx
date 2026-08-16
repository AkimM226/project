import { useEffect, useState, useCallback } from 'react';
import { supabase, DashboardStats } from '@/lib/supabase';
import { Droplet, Trophy, TrendingUp, ArrowLeft } from 'lucide-react';

export function PublicView({ onExit }: { onExit?: () => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (!error && data) setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const goalPct = Math.min(100, (stats.totalPresent / stats.objectif) * 100);
  const winning = stats.scoreGarcons > stats.scoreFilles ? 'garcons' : stats.scoreFilles > stats.scoreGarcons ? 'filles' : 'egalite';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-4">
      <div className="max-w-md mx-auto pt-8 pb-12">
        {/* Exit button */}
        {onExit && (
          <button
            onClick={onExit}
            className="mb-4 inline-flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-3">
            <Droplet className="w-10 h-10 text-red-600" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-white">Le Match Continue</h1>
          <p className="text-red-200 text-sm mt-1">CDS — Don de sang 2026</p>
        </div>

        {/* Goal gauge */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Objectif global</h2>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-red-600">{stats.totalPresent}</span>
            <span className="text-xl text-gray-400 mb-1">/ {stats.objectif} donneurs</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {goalPct >= 100 ? 'Objectif atteint !' : `${Math.round(goalPct)}% de l'objectif`}
          </p>
        </div>

        {/* Match score */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">Score du Match</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 text-center ${winning === 'garcons' ? 'bg-blue-50 ring-2 ring-blue-400' : 'bg-gray-50'}`}>
              <div className="text-3xl font-bold text-blue-600">{stats.scoreGarcons}</div>
              <div className="text-sm text-gray-600 mt-1">Garçons</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${winning === 'filles' ? 'bg-pink-50 ring-2 ring-pink-400' : 'bg-gray-50'}`}>
              <div className="text-3xl font-bold text-pink-600">{stats.scoreFilles}</div>
              <div className="text-sm text-gray-600 mt-1">Filles</div>
            </div>
          </div>
        </div>

        <p className="text-center text-red-200 text-xs mt-6">
          Don de sang le 28 août avec le CRTS de Bobo-Dioulasso
        </p>
      </div>
    </div>
  );
}

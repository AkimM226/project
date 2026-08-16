import { useEffect, useState, useCallback } from 'react';
import { supabase, DashboardStats } from '@/lib/supabase';
import { Droplet, Users, Trophy, TrendingUp } from 'lucide-react';

interface Props {
  refreshKey?: number;
}

export function Dashboard({ refreshKey = 0 }: Props) {
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
  }, [fetchStats, refreshKey]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  const goalPct = Math.min(100, (stats.totalPresent / stats.objectif) * 100);
  const winning = stats.scoreGarcons > stats.scoreFilles ? 'garcons' : stats.scoreFilles > stats.scoreGarcons ? 'filles' : 'egalite';

  return (
    <div className="space-y-6">
      {/* Goal gauge */}
      <div className="bg-white rounded-2xl shadow-md p-6">
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
        <p className="text-sm text-gray-500 mt-2">
          {goalPct >= 100 ? 'Objectif atteint ! Bravo !' : `${Math.round(goalPct)}% de l'objectif`}
        </p>
      </div>

      {/* Match score */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">Score du Match</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Boys */}
          <div className={`rounded-xl p-4 text-center ${winning === 'garcons' ? 'bg-blue-50 ring-2 ring-blue-400' : 'bg-gray-50'}`}>
            <div className="text-3xl font-bold text-blue-600">{stats.scoreGarcons}</div>
            <div className="text-sm text-gray-600 mt-1">Garçons</div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <div>Mobilisation: {stats.mobilisationGarcons}</div>
              <div>Bonus match: +{stats.bonusGarcons}</div>
            </div>
          </div>

          {/* Girls */}
          <div className={`rounded-xl p-4 text-center ${winning === 'filles' ? 'bg-pink-50 ring-2 ring-pink-400' : 'bg-gray-50'}`}>
            <div className="text-3xl font-bold text-pink-600">{stats.scoreFilles}</div>
            <div className="text-sm text-gray-600 mt-1">Filles</div>
            <div className="text-xs text-gray-400 mt-2 space-y-0.5">
              <div>Mobilisation: {stats.mobilisationFilles}</div>
              <div>Bonus match: +{stats.bonusFilles}</div>
            </div>
          </div>
        </div>

        {winning === 'egalite' ? (
          <p className="text-center text-sm text-gray-500 mt-4">Égalité parfaite !</p>
        ) : (
          <p className="text-center text-sm font-medium text-gray-700 mt-4">
            {winning === 'garcons' ? 'Les Garçons mènent' : 'Les Filles mènent'}
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Droplet className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">Détail des présences</h2>
        </div>
        <div className="space-y-3">
          <BreakdownRow label="Promesses tenues (Garçons)" value={stats.promessesPresentesGarcons} color="blue" />
          <BreakdownRow label="Recruteurs présents (Garçons)" value={stats.recruteursPresentsGarcons} color="blue" />
          <BreakdownRow label="Promesses tenues (Filles)" value={stats.promessesPresentesFilles} color="pink" />
          <BreakdownRow label="Recruteurs présents (Filles)" value={stats.recruteursPresentsFilles} color="pink" />
          <BreakdownRow label="Inscriptions Staff présentes" value={stats.staffPresentes} color="green" />
          <BreakdownRow label="Donneurs spontanés" value={stats.spontanes} color="gray" />
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-4 text-center">
          <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalPromesses}</div>
          <div className="text-xs text-gray-500">Promesses (J1)</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4 text-center">
          <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalInscriptions}</div>
          <div className="text-xs text-gray-500">Inscriptions Staff</div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
    gray: 'bg-gray-400',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colorMap[color]}`} />
        <span className="font-semibold text-gray-900">{value}</span>
      </div>
    </div>
  );
}

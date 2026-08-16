import { useState, useCallback, useEffect } from 'react';
import { supabase, normalizePhone, PointageResult } from '@/lib/supabase';
import { Search, Check, AlertCircle, Droplet, User, Phone, Trophy } from 'lucide-react';

export function PointageJ2({ onPointed }: { onPointed?: () => void }) {
  const [telephone, setTelephone] = useState('');
  const [nom, setNom] = useState('');
  const [result, setResult] = useState<PointageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<Array<{ nom: string; type: string; time: string }>>([]);

  const handlePointage = async () => {
    setError('');
    if (telephone.trim().length < 8) {
      setError('Numéro de téléphone trop court');
      return;
    }
    setLoading(true);
    const phone = normalizePhone(telephone);
    const { data, error: err } = await supabase.rpc('pointer_personne', {
      p_telephone: phone,
      p_nom: nom.trim() || null,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setResult(data as PointageResult);
    if ((data as PointageResult).status === 'success') {
      setRecent([{ nom: (data as PointageResult).nom, type: (data as PointageResult).type, time: new Date().toLocaleTimeString('fr-FR') }, ...recent].slice(0, 10));
      onPointed?.();
    }
    setTelephone('');
    setNom('');
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-red-600" fill="currentColor" />
          Pointage des donneurs
        </h2>
        <p className="text-sm text-gray-500">Recherchez par numéro de téléphone. Le système identifie automatiquement la source.</p>

        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone du donneur</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              inputMode="numeric"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePointage()}
              placeholder="Ex: 0701020304"
              className="w-full pl-10 pr-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom (optionnel, pour donneurs spontanés)</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePointage()}
            placeholder="Laisser vide si déjà inscrit"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handlePointage}
          disabled={telephone.length < 8 || loading}
          className="w-full py-4 bg-red-600 text-white font-bold text-lg rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Search className="w-5 h-5" />
              Pointer ce donneur
            </>
          )}
        </button>
      </div>

      {result && (
        <div className={`rounded-2xl shadow-md p-5 ${result.status === 'success' ? 'bg-green-50' : 'bg-orange-50'}`}>
          <div className="flex items-start gap-3">
            {result.status === 'success' ? (
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-7 h-7 text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">
                {result.status === 'success' ? 'Présence validée !' : 'Déjà pointé'}
              </p>
              <div className="space-y-1 mt-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{result.nom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Source:</span>
                  <span className="font-medium capitalize">
                    {result.type === 'recruteur' ? 'Recruteur (lui-même)' :
                     result.type === 'promesse' ? 'Promesse' :
                     result.type === 'staff' ? 'Inscription Staff' :
                     'Donneur spontané'}
                  </span>
                </div>
                {result.equipe && (
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      Point pour: {result.equipe === 'garcons' ? 'Garçons' : 'Filles'}
                    </span>
                  </div>
                )}
                {result.recruteur && (
                  <div className="text-gray-500">Recruteur: {result.recruteur}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Pointages récents</h3>
          <div className="space-y-2">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-gray-50 p-2.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{r.nom}</span>
                  <span className="text-xs text-gray-400 capitalize">({r.type})</span>
                </div>
                <span className="text-xs text-gray-400">{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

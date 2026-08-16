import { useState, useEffect, useCallback } from 'react';
import { supabase, normalizePhone, CheckResult, Participant, Promesse } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, Phone, AlertCircle, Check, X, Users, Trash2 } from 'lucide-react';

interface Props {
  onSaved?: () => void;
}

export function SaisieJ1({ onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'recruteur' | 'promesses'>('recruteur');
  const [recruteur, setRecruteur] = useState({ nom: '', telephone: '', genre: 'M' as 'M' | 'F', role: 'joueur' as 'joueur' | 'spectateur' });
  const [recruteurId, setRecruteurId] = useState<string | null>(null);
  const [promesses, setPromesses] = useState<{ nom: string; telephone: string }[]>([]);
  const [newPromesse, setNewPromesse] = useState({ nom: '', telephone: '' });
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentRecruteurs, setRecentRecruteurs] = useState<Participant[]>([]);

  const fetchRecent = useCallback(async () => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentRecruteurs(data);
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const checkPhone = async (phone: string) => {
    if (phone.length < 8) {
      setCheckResult(null);
      return;
    }
    setChecking(true);
    const { data } = await supabase.rpc('check_telephone', { p_telephone: normalizePhone(phone) });
    setCheckResult(data as CheckResult);
    setChecking(false);
  };

  const handleRecruteurPhone = (val: string) => {
    setRecruteur({ ...recruteur, telephone: val });
    checkPhone(val);
  };

  const handlePromessePhone = (val: string) => {
    setNewPromesse({ ...newPromesse, telephone: val });
    checkPhone(val);
  };

  const saveRecruteur = async () => {
    setError('');
    if (!recruteur.nom.trim() || !recruteur.telephone.trim()) {
      setError('Nom et téléphone requis');
      return;
    }
    if (checkResult?.exists) {
      setError(`Ce téléphone existe déjà (${checkResult.source}: ${checkResult.nom})`);
      return;
    }
    const phone = normalizePhone(recruteur.telephone);
    const { data, error: err } = await supabase
      .from('participants')
      .insert({
        nom: recruteur.nom.trim(),
        telephone: phone,
        genre: recruteur.genre,
        role_joueur: recruteur.role,
        saisi_par_utilisateur_id: user?.id,
      })
      .select()
      .single();

    if (err) {
      if (err.code === '23505') setError('Ce téléphone existe déjà dans le système');
      else setError(err.message);
      return;
    }
    setRecruteurId(data.id);
    setStep('promesses');
    setSuccess(`${recruteur.nom} enregistré comme recruteur`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const addPromesse = async () => {
    setError('');
    if (!newPromesse.nom.trim() || !newPromesse.telephone.trim()) {
      setError('Nom et téléphone requis');
      return;
    }
    if (checkResult?.exists) {
      setError(`Ce téléphone existe déjà (${checkResult.source}: ${checkResult.nom})`);
      return;
    }
    const phone = normalizePhone(newPromesse.telephone);
    const { error: err } = await supabase.from('promesses').insert({
      recruteur_id: recruteurId,
      nom_personne: newPromesse.nom.trim(),
      telephone: phone,
      saisi_par_utilisateur_id: user?.id,
    });

    if (err) {
      if (err.code === '23505') setError('Ce téléphone existe déjà dans le système');
      else setError(err.message);
      return;
    }

    setPromesses([...promesses, { nom: newPromesse.nom, telephone: newPromesse.telephone }]);
    setNewPromesse({ nom: '', telephone: '' });
    setCheckResult(null);
    setSuccess('Promesse ajoutée');
    setTimeout(() => setSuccess(''), 1500);
  };

  const resetForm = () => {
    setStep('recruteur');
    setRecruteur({ nom: '', telephone: '', genre: 'M', role: 'joueur' });
    setRecruteurId(null);
    setPromesses([]);
    setNewPromesse({ nom: '', telephone: '' });
    setCheckResult(null);
    setError('');
    fetchRecent();
    onSaved?.();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-1 ${step === 'recruteur' ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'recruteur' ? 'bg-red-600 text-white' : recruteurId ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
            {recruteurId ? <Check className="w-4 h-4" /> : '1'}
          </span>
          Recruteur
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div className={`flex items-center gap-1 ${step === 'promesses' ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'promesses' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>2</span>
          Promesses
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {step === 'recruteur' && (
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-600" />
            Nouveau recruteur
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              type="text"
              value={recruteur.nom}
              onChange={(e) => setRecruteur({ ...recruteur, nom: e.target.value })}
              placeholder="Ex: Jean Kouassi"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={recruteur.telephone}
                onChange={(e) => handleRecruteurPhone(e.target.value)}
                placeholder="Ex: 0701020304"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
              />
            </div>
            {checking && <p className="text-xs text-gray-400 mt-1">Vérification...</p>}
            {checkResult?.exists && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                Doublon: {checkResult.source} — {checkResult.nom}
              </div>
            )}
            {checkResult && !checkResult.exists && recruteur.telephone.length >= 8 && (
              <div className="flex items-center gap-2 text-green-600 text-sm mt-2 bg-green-50 p-2 rounded-lg">
                <Check className="w-4 h-4" />
                Téléphone disponible
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Équipe (genre)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecruteur({ ...recruteur, genre: 'M' })}
                className={`py-3 rounded-xl font-medium border-2 transition-colors ${recruteur.genre === 'M' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Garçons
              </button>
              <button
                type="button"
                onClick={() => setRecruteur({ ...recruteur, genre: 'F' })}
                className={`py-3 rounded-xl font-medium border-2 transition-colors ${recruteur.genre === 'F' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Filles
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecruteur({ ...recruteur, role: 'joueur' })}
                className={`py-3 rounded-xl font-medium border-2 transition-colors ${recruteur.role === 'joueur' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Joueur
              </button>
              <button
                type="button"
                onClick={() => setRecruteur({ ...recruteur, role: 'spectateur' })}
                className={`py-3 rounded-xl font-medium border-2 transition-colors ${recruteur.role === 'spectateur' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Spectateur
              </button>
            </div>
          </div>

          <button
            onClick={saveRecruteur}
            disabled={!recruteur.nom.trim() || recruteur.telephone.length < 8 || checkResult?.exists || checking}
            className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Enregistrer le recruteur
          </button>

          {recentRecruteurs.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Recruteurs récents</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {recentRecruteurs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{r.nom}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.genre === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {r.genre === 'M' ? 'Garçons' : 'Filles'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'promesses' && recruteurId && (
        <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Promesses de {recruteur.nom}
          </h2>

          {promesses.length > 0 && (
            <div className="space-y-2">
              {promesses.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-800">{p.nom}</span>
                    <span className="text-sm text-gray-500 ml-2">{p.telephone}</span>
                  </div>
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">Ajouter une promesse</h3>
            <input
              type="text"
              value={newPromesse.nom}
              onChange={(e) => setNewPromesse({ ...newPromesse, nom: e.target.value })}
              placeholder="Nom de la personne promise"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
            />
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={newPromesse.telephone}
                  onChange={(e) => handlePromessePhone(e.target.value)}
                  placeholder="Téléphone"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
                />
              </div>
              {checkResult?.exists && newPromesse.telephone.length >= 8 && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  Doublon: {checkResult.source} — {checkResult.nom}
                </div>
              )}
            </div>
            <button
              onClick={addPromesse}
              disabled={!newPromesse.nom.trim() || newPromesse.telephone.length < 8 || checkResult?.exists || checking}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Ajouter la promesse
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForm}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Nouveau recruteur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

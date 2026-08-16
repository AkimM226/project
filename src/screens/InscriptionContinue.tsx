import { useState, useEffect, useCallback } from 'react';
import { supabase, normalizePhone, CheckResult, InscriptionStaff } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, Phone, AlertCircle, Check, Trash2 } from 'lucide-react';

export function InscriptionContinue() {
  const { user } = useAuth();
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inscriptions, setInscriptions] = useState<InscriptionStaff[]>([]);

  const fetchInscriptions = useCallback(async () => {
    const { data } = await supabase
      .from('inscriptions_staff')
      .select('*')
      .eq('staff_utilisateur_id', user?.id)
      .order('timestamp_enregistrement', { ascending: false });
    if (data) setInscriptions(data);
  }, [user?.id]);

  useEffect(() => {
    fetchInscriptions();
  }, [fetchInscriptions]);

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

  const handleSubmit = async () => {
    setError('');
    if (!nom.trim() || !telephone.trim()) {
      setError('Nom et téléphone requis');
      return;
    }
    if (checkResult?.exists) {
      setError(`Ce téléphone existe déjà (${checkResult.source}: ${checkResult.nom})`);
      return;
    }
    const phone = normalizePhone(telephone);
    const { error: err } = await supabase.from('inscriptions_staff').insert({
      staff_utilisateur_id: user?.id,
      nom: nom.trim(),
      telephone: phone,
    });
    if (err) {
      if (err.code === '23505') setError('Ce téléphone existe déjà dans le système');
      else setError(err.message);
      return;
    }
    setSuccess(`${nom} inscrit avec succès`);
    setTimeout(() => setSuccess(''), 2000);
    setNom('');
    setTelephone('');
    setCheckResult(null);
    fetchInscriptions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('inscriptions_staff').delete().eq('id', id);
    fetchInscriptions();
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-red-600" />
          Inscrire une personne
        </h2>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Mariam Traoré"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={telephone}
              onChange={(e) => {
                setTelephone(e.target.value);
                checkPhone(e.target.value);
              }}
              placeholder="Ex: 0701020304"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
            />
          </div>
          {checking && <p className="text-xs text-gray-400 mt-1">Vérification...</p>}
          {checkResult?.exists && telephone.length >= 8 && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              Doublon: {checkResult.source} — {checkResult.nom}
            </div>
          )}
          {checkResult && !checkResult.exists && telephone.length >= 8 && (
            <div className="flex items-center gap-2 text-green-600 text-sm mt-2 bg-green-50 p-2 rounded-lg">
              <Check className="w-4 h-4" />
              Téléphone disponible
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!nom.trim() || telephone.length < 8 || checkResult?.exists || checking}
          className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Inscrire
        </button>
      </div>

      {inscriptions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Mes inscriptions ({inscriptions.length})</h3>
          <div className="space-y-2">
            {inscriptions.map((ins) => (
              <div key={ins.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{ins.nom}</span>
                  <span className="text-sm text-gray-500 ml-2">{ins.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  {ins.statut === 'presente' ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Présent</span>
                  ) : (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">En attente</span>
                  )}
                  {ins.statut === 'en_attente' && (
                    <button onClick={() => handleDelete(ins.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

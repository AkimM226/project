import { useState, useEffect, useCallback } from 'react';
import { supabase, MatchConfig } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Settings, Users, Download, UserPlus, Trash2, AlertCircle, Check, RotateCcw } from 'lucide-react';

type Tab = 'bonus' | 'users' | 'export' | 'reset';

export function Admin() {
  const [tab, setTab] = useState<Tab>('bonus');

  return (
    <div className="space-y-4 pb-4">
      <div className="flex gap-2">
        <TabButton active={tab === 'bonus'} onClick={() => setTab('bonus')} icon={<Settings className="w-4 h-4" />}>
          Bonus match
        </TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="w-4 h-4" />}>
          Utilisateurs
        </TabButton>
        <TabButton active={tab === 'export'} onClick={() => setTab('export')} icon={<Download className="w-4 h-4" />}>
          Export CSV
        </TabButton>
        <TabButton active={tab === 'reset'} onClick={() => setTab('reset')} icon={<RotateCcw className="w-4 h-4" />}>
          Réinitialiser
        </TabButton>
      </div>

      {tab === 'bonus' && <BonusTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'export' && <ExportTab />}
      {tab === 'reset' && <ResetTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center ${
        active ? 'bg-red-600 text-white' : 'bg-white text-gray-600 shadow-sm'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function BonusTab() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [bonusG, setBonusG] = useState(0);
  const [bonusF, setBonusF] = useState(0);
  const [objectif, setObjectif] = useState(50);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('match_config').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        setConfig(data);
        setBonusG(data.score_bonus_garcons);
        setBonusF(data.score_bonus_filles);
        setObjectif(data.objectif_global);
      }
    });
  }, []);

  const save = async () => {
    setError('');
    const { error: err } = await supabase
      .from('match_config')
      .update({
        score_bonus_garcons: bonusG,
        score_bonus_filles: bonusF,
        objectif_global: objectif,
      })
      .eq('id', 1);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Réglage du bonus match</h2>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          <Check className="w-4 h-4" />
          Enregistré
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Garçons (score du match du 27)</label>
        <input
          type="number"
          value={bonusG}
          onChange={(e) => setBonusG(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none text-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Filles (score du match du 27)</label>
        <input
          type="number"
          value={bonusF}
          onChange={(e) => setBonusF(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none text-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Objectif global (nombre de donneurs)</label>
        <input
          type="number"
          value={objectif}
          onChange={(e) => setObjectif(parseInt(e.target.value) || 50)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none text-lg"
        />
      </div>

      <button
        onClick={save}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
      >
        Enregistrer
      </button>
    </div>
  );
}

function UsersTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; prenom: string; role: string; created_at: string }>>([]);
  const [newPrenom, setNewPrenom] = useState('');
  const [newRole, setNewRole] = useState<'mobilisateur' | 'staff'>('mobilisateur');
  const [newPin, setNewPin] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('utilisateurs').select('id, prenom, role, created_at').order('created_at', { ascending: true });
    if (data) setUsers(data);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addUser = async () => {
    setError('');
    setNewPin(null);
    if (!newPrenom.trim()) {
      setError('Prénom requis');
      return;
    }
    const { data, error: err } = await supabase.rpc('create_user', {
      p_prenom: newPrenom.trim(),
      p_role: newRole,
    });
    if (err) {
      setError(err.message);
      return;
    }
    if (data && data[0]) {
      setNewPin(data[0].v_pin);
    }
    setNewPrenom('');
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) {
      setError('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    await supabase.from('utilisateurs').delete().eq('id', id);
    fetchUsers();
  };

  const roleLabel = (r: string) => r === 'organisateur' ? 'Organisateur' : r === 'mobilisateur' ? 'Mobilisateur' : 'Staff';
  const roleColor = (r: string) => r === 'organisateur' ? 'bg-red-100 text-red-700' : r === 'mobilisateur' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-red-600" />
          Ajouter un utilisateur
        </h2>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {newPin && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-2">
            <p className="text-sm text-green-700">Utilisateur créé. Transmettez ce PIN :</p>
            <p className="text-3xl font-bold text-center text-green-700 tracking-[0.3em]">{newPin}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
          <input
            type="text"
            value={newPrenom}
            onChange={(e) => setNewPrenom(e.target.value)}
            placeholder="Ex: Awa"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNewRole('mobilisateur')}
              className={`py-3 rounded-xl font-medium border-2 transition-colors ${newRole === 'mobilisateur' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              Mobilisateur
            </button>
            <button
              type="button"
              onClick={() => setNewRole('staff')}
              className={`py-3 rounded-xl font-medium border-2 transition-colors ${newRole === 'staff' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              Staff
            </button>
          </div>
        </div>

        <button
          onClick={addUser}
          disabled={!newPrenom.trim()}
          className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Créer l'utilisateur
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Tous les utilisateurs ({users.length})</h3>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-800">{u.prenom}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>{roleLabel(u.role)}</span>
              </div>
              {u.role !== 'organisateur' && (
                <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const exportCSV = async () => {
    setExporting(true);
    setDone(false);

    const [participants, promesses, staff, spontanes] = await Promise.all([
      supabase.from('participants').select('nom, telephone, genre, role_joueur, present, timestamp_pointage, created_at'),
      supabase.from('promesses').select('nom_personne, telephone, statut, timestamp_enregistrement, timestamp_pointage, recruteur_id'),
      supabase.from('inscriptions_staff').select('nom, telephone, statut, timestamp_enregistrement, timestamp_pointage'),
      supabase.from('donneurs_spontanes').select('nom, telephone, timestamp_pointage'),
    ]);

    const recruteurMap = new Map<string, string>();
    if (participants.data) {
      participants.data.forEach((p) => recruteurMap.set(p.id, p.nom));
    }

    const rows: string[] = [];
    rows.push('Type,Nom,Telephone,Equipe,Statut,Recruteur,Date_Inscription,Date_Pointage');

    const escape = (s: string | null) => `"${(s || '').replace(/"/g, '""')}"`;

    participants.data?.forEach((p) => {
      rows.push([
        'Recruteur',
        escape(p.nom),
        escape(p.telephone),
        p.genre === 'M' ? 'Garcons' : 'Filles',
        p.present ? 'Present' : 'En_attente',
        '',
        p.created_at,
        p.timestamp_pointage || '',
      ].join(','));
    });

    promesses.data?.forEach((p) => {
      rows.push([
        'Promesse',
        escape(p.nom_personne),
        escape(p.telephone),
        '',
        p.statut,
        escape(recruteurMap.get(p.recruteur_id) || ''),
        p.timestamp_enregistrement,
        p.timestamp_pointage || '',
      ].join(','));
    });

    staff.data?.forEach((s) => {
      rows.push([
        'Staff',
        escape(s.nom),
        escape(s.telephone),
        '',
        s.statut,
        '',
        s.timestamp_enregistrement,
        s.timestamp_pointage || '',
      ].join(','));
    });

    spontanes.data?.forEach((s) => {
      rows.push([
        'Spontane',
        escape(s.nom),
        escape(s.telephone),
        '',
        'Present',
        '',
        '',
        s.timestamp_pointage,
      ].join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `le_match_continue_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Download className="w-5 h-5 text-red-600" />
        Export CSV
      </h2>
      <p className="text-sm text-gray-500">
        Téléchargez un fichier CSV avec toutes les données: recruteurs, promesses, inscriptions staff et donneurs spontanés.
      </p>

      {done && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          <Check className="w-4 h-4" />
          Export téléchargé avec succès
        </div>
      )}

      <button
        onClick={exportCSV}
        disabled={exporting}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Exportation...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Télécharger le CSV
          </>
        )}
      </button>
    </div>
  );
}

function ResetTab() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    setResetting(true);
    setError('');
    const { data, error: err } = await supabase.rpc('reset_database');
    setResetting(false);
    if (err) {
      setError(err.message);
      setConfirming(false);
      return;
    }
    if (data) {
      setDone(true);
      setConfirming(false);
      setTimeout(() => setDone(false), 4000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <RotateCcw className="w-5 h-5 text-red-600" />
        Réinitialiser la base de données
      </h2>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          <Check className="w-4 h-4" />
          Base de données réinitialisée avec succès
        </div>
      )}

      <p className="text-sm text-gray-600">
        Cette action efface toutes les données de l'événement: recruteurs, promesses, inscriptions staff, donneurs spontanés et utilisateurs non-organisateurs.
      </p>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-red-700">Données qui seront supprimées:</p>
        <ul className="text-sm text-red-600 space-y-1 pl-4 list-disc">
          <li>Tous les recruteurs et leurs promesses</li>
          <li>Toutes les inscriptions Staff</li>
          <li>Tous les donneurs spontanés</li>
          <li>Tous les comptes Mobilisateur et Staff</li>
        </ul>
        <p className="text-sm text-green-600 font-medium mt-2">
          Les comptes Organisateurs et le bonus match sont conservés (remis à 0).
        </p>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Réinitialiser la base
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-700">Êtes-vous absolument sûr ?</p>
            <p className="text-xs text-red-600 mt-1">Cette action est irréversible.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {resetting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { Dashboard } from '@/screens/Dashboard';
import { SaisieJ1 } from '@/screens/SaisieJ1';
import { InscriptionContinue } from '@/screens/InscriptionContinue';
import { PointageJ2 } from '@/screens/PointageJ2';
import { Admin } from '@/screens/Admin';
import { PublicView } from '@/screens/PublicView';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Droplet, LayoutDashboard, UserPlus, ClipboardList, CheckSquare, Settings, LogOut, Globe } from 'lucide-react';
import type { Role } from '@/lib/supabase';

type Screen = 'dashboard' | 'saisie' | 'inscription' | 'pointage' | 'admin' | 'public';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['organisateur', 'mobilisateur', 'staff'] },
  { id: 'saisie', label: 'Saisie J1', icon: <UserPlus className="w-5 h-5" />, roles: ['organisateur', 'mobilisateur'] },
  { id: 'inscription', label: 'Inscription', icon: <ClipboardList className="w-5 h-5" />, roles: ['organisateur', 'staff'] },
  { id: 'pointage', label: 'Pointage J2', icon: <CheckSquare className="w-5 h-5" />, roles: ['organisateur', 'mobilisateur', 'staff'] },
  { id: 'admin', label: 'Administration', icon: <Settings className="w-5 h-5" />, roles: ['organisateur'] },
];

function MainApp() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  // Check for public view in URL hash
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#public') {
        setScreen('public');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  if (screen === 'public') {
    return <PublicView onExit={() => setScreen('dashboard')} />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <Droplet className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Le Match Continue</h1>
              <p className="text-xs text-gray-400">{user.prenom} — {user.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SyncIndicator />
            <button
              onClick={() => setScreen('public')}
              className="text-gray-400 hover:text-red-600"
              title="Vue publique"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button onClick={logout} className="text-gray-400 hover:text-red-600" title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4">
        {screen === 'dashboard' && <Dashboard refreshKey={refreshKey} />}
        {screen === 'saisie' && <SaisieJ1 onSaved={triggerRefresh} />}
        {screen === 'inscription' && <InscriptionContinue />}
        {screen === 'pointage' && <PointageJ2 onPointed={triggerRefresh} />}
        {screen === 'admin' && <Admin />}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-md mx-auto px-2 py-1.5 flex justify-around">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                screen === item.id ? 'text-red-600 bg-red-50' : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;

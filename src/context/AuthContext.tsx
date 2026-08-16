import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Utilisateur } from '@/lib/supabase';

interface AuthContextValue {
  user: Utilisateur | null;
  loading: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'lmc_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = async (pin: string) => {
    const { data, error } = await supabase.rpc('verify_pin', { p_pin: pin });
    if (error) return { success: false, error: 'Erreur de connexion' };
    if (!data || data.length === 0 || !data[0].v_id) {
      return { success: false, error: 'PIN incorrect' };
    }
    const u: Utilisateur = { id: data[0].v_id, prenom: data[0].v_prenom, role: data[0].v_role };
    setUser(u);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

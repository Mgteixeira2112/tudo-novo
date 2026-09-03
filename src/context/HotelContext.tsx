import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  HotelSettings,
  Guest,
  Room,
  Reservation,
  KanbanTask,
  FinancialTransaction,
  FinancialStats,
  SupabaseConfigStatus,
  StaffUser,
  AdminTab,
  PermissionKey
} from '../types.ts';
import { api, setApiAccessToken, hasApiAccessToken } from '../services/api.ts';
import {
  hasPermission as checkHasPermission,
  canAccessTab as checkCanAccessTab,
  getDefaultTabForUser
} from '../services/rbac.ts';
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  getSupabaseAuthSession,
  subscribeToStaffUsersRealtime,
  getSupabaseStaffProfile,
  bootstrapFirstAdmin
} from '../services/supabase.ts';

interface HotelContextType {
  settings: HotelSettings | null;
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  tasks: KanbanTask[];
  transactions: FinancialTransaction[];
  stats: FinancialStats | null;
  supabaseStatus: SupabaseConfigStatus | null;
  loading: boolean;
  error: string | null;
  mode: 'admin' | 'booking';
  setMode: (mode: 'admin' | 'booking') => void;
  activeAdminTab: AdminTab;
  setActiveAdminTab: (tab: AdminTab) => void;
  refreshData: () => Promise<void>;
  updateSettings: (updates: Partial<HotelSettings>) => Promise<void>;

  // User Management & RBAC
  currentUser: StaffUser | null;
  allUsers: StaffUser[];
  isImpersonating: boolean;
  login: (email: string, password?: string) => Promise<StaffUser>;
  bootstrapAdmin: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean; user: any; profile: StaffUser | null }>;
  registerStaff: (data: {
    email: string;
    password?: string;
    fullName: string;
    role?: any;
    sector?: any;
    phone?: string;
    permissions?: PermissionKey[];
  }) => Promise<StaffUser>;
  logout: () => Promise<void>;
  switchUser: (userOrId: StaffUser | string) => void;
  revertToAdminUser: () => void;
  createUser: (userData: Omit<StaffUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StaffUser>;
  updateUser: (id: string, updates: Partial<StaffUser>) => Promise<StaffUser>;
  deleteUser: (id: string) => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessTab: (tab: AdminTab) => boolean;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'admin' | 'booking'>('admin');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');

  // Staff Users State
  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminUser, setOriginalAdminUser] = useState<StaffUser | null>(null);

  const clearPrivateData = useCallback(() => {
    setRooms([]); setGuests([]); setReservations([]); setTasks([]); setTransactions([]); setStats(null); setSupabaseStatus(null); setAllUsers([]);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      if (!hasApiAccessToken()) {
        const publicSettings = await api.getPublicSettings();
        setSettings(publicSettings);
        clearPrivateData();
        setError(null);
        return;
      }
      const [fetchedSettings, fetchedRooms, fetchedGuests, fetchedReservations, fetchedTasks, fetchedTransactions, fetchedStats, fetchedSupabase, fetchedUsers] = await Promise.all([
        api.getSettings(), api.getRooms(), api.getGuests(), api.getReservations(), api.getTasks(), api.getTransactions(), api.getFinancialStats(), api.getSupabaseStatus().catch(() => null), api.getUsers().catch(() => [])
      ]);
      setSettings(fetchedSettings); setRooms(fetchedRooms); setGuests(fetchedGuests); setReservations(fetchedReservations); setTasks(fetchedTasks); setTransactions(fetchedTransactions); setStats(fetchedStats); setSupabaseStatus(fetchedSupabase); setAllUsers(fetchedUsers); setError(null);
    } catch (err: any) {
      console.error('Error fetching hotel data:', err);
      setError(err.message || 'Erro ao carregar dados do servidor.');
    } finally { setLoading(false); }
  }, [clearPrivateData]);

  const updateSettings = async (updates: Partial<HotelSettings>) => {
    try {
      const updated = await api.updateSettings(updates);
      setSettings(updated);
    } catch (err: any) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  // -------------------------------------------------------------
  // RBAC & Auth Actions
  // -------------------------------------------------------------
  const login = async (email: string, password?: string): Promise<StaffUser> => {
    try {
      const { data, error: supaErr } = await supabaseSignIn(email, password, {
        url: supabaseStatus?.supabaseUrl,
        anonKey: supabaseStatus?.supabaseAnonKey
      });
      if (supaErr || !data?.session || !data.user) {
        throw supaErr || new Error('Credenciais inválidas.');
      }

      setApiAccessToken(data.session.access_token);
      let staff: StaffUser | null = null;
      try {
        const result = await api.login({ email, password, supabaseAuthId: data.user.id });
        staff = result.user;
      } catch {
        staff = await getSupabaseStaffProfile(data.user.id);
      }
      if (!staff || !staff.active) {
        throw new Error('Usuário autenticado, mas sem perfil de colaborador ativo.');
      }
      setCurrentUser(staff);
      setIsImpersonating(false);
      setOriginalAdminUser(null);
      try {
        localStorage.setItem('hotel_auth_user_id', staff.id);
      } catch {}

      // Switch to the user's primary default tab
      const defaultTab = getDefaultTabForUser(staff);
      setActiveAdminTab(defaultTab);
      await refreshData();
      return staff;
    } catch (err: any) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const bootstrapAdmin = async (email: string, password: string) => {
    const result = await bootstrapFirstAdmin(email, password);
    if (result.profile) {
      const session = await getSupabaseAuthSession();
      if (session?.access_token) setApiAccessToken(session.access_token);
      setCurrentUser(result.profile);
      setActiveAdminTab('overview');
      setMode('admin');
    }
    return result;
  };

  const registerStaff = async (data: {
    email: string;
    password?: string;
    fullName: string;
    role?: any;
    sector?: any;
    phone?: string;
    permissions?: PermissionKey[];
  }): Promise<StaffUser> => {
    try {
      // Do not create Supabase Auth users from the browser while logged in as an admin.
      // That flow can replace the current session and leave Auth/profile records inconsistent.
      // Staff provisioning must happen through the protected backend/service-role flow.
      if (!hasApiAccessToken()) {
        throw new Error('Criação de colaboradores requer uma sessão administrativa válida.');
      }

      const result = await api.register({
        ...data,
        supabaseAuthId: undefined
      });

      setAllUsers(prev => [...prev, result.user]);
      return result.user;
    } catch (err: any) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (supabaseStatus?.connected) {
        await supabaseSignOut({
          url: supabaseStatus.supabaseUrl,
          anonKey: supabaseStatus.supabaseAnonKey
        }).catch(() => {});
      }
    } catch {}

    try {
      localStorage.removeItem('hotel_auth_user_id');
    } catch {}

    setApiAccessToken(null);
    setIsImpersonating(false);
    setOriginalAdminUser(null);
    setCurrentUser(null);
    clearPrivateData();
    setMode('booking');
    await refreshData().catch(() => {});
  };

  // Security: client-side impersonation is disabled.
  // Changing only currentUser while keeping the administrator Bearer token would make
  // server-side authorization continue to run with administrator privileges.
  const switchUser = (_userOrId: StaffUser | string) => {
    setError('Impersonação desativada por segurança. Use uma conta real do perfil para testar permissões.');
  };

  const revertToAdminUser = () => {
    setIsImpersonating(false);
    setOriginalAdminUser(null);
  };

  const createUser = async (userData: Omit<StaffUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<StaffUser> => {
    const created = await api.createUser(userData);
    setAllUsers(prev => [...prev, created]);
    return created;
  };

  const updateUser = async (id: string, updates: Partial<StaffUser>): Promise<StaffUser> => {
    const updated = await api.updateUser(id, updates);
    setAllUsers(prev => prev.map(u => (u.id === id ? updated : u)));
    if (currentUser?.id === id) {
      setCurrentUser(updated);
    }
    return updated;
  };

  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser?.id === id) {
      await logout();
    }
  };

  const hasPermission = (permission: PermissionKey) => {
    return checkHasPermission(currentUser, permission);
  };

  const canAccessTab = (tab: AdminTab) => {
    return checkCanAccessTab(currentUser, tab);
  };

  // Restore persisted Supabase session and map it to the local staff profile.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const session = await getSupabaseAuthSession({
          url: supabaseStatus?.supabaseUrl,
          anonKey: supabaseStatus?.supabaseAnonKey
        });
        if (!session?.access_token || cancelled) return;

        setApiAccessToken(session.access_token);
        let staff: StaffUser | null = null;
        try {
          staff = await api.me();
        } catch {
          staff = await getSupabaseStaffProfile(session.user.id);
        }
        if (!staff || cancelled) return;

        setCurrentUser(staff);
        setIsImpersonating(false);
        setOriginalAdminUser(null);
        const defaultTab = getDefaultTabForUser(staff);
        setActiveAdminTab(defaultTab);
        await refreshData();
      } catch {
        setApiAccessToken(null);
        if (!cancelled) setCurrentUser(null);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [supabaseStatus?.supabaseUrl, supabaseStatus?.supabaseAnonKey]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Supabase Realtime subscription for staff_users updates
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToStaffUsersRealtime(
      () => {
        api.getUsers().then(setAllUsers).catch(() => {});
      },
      {
        url: supabaseStatus?.supabaseUrl,
        anonKey: supabaseStatus?.supabaseAnonKey
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [currentUser?.id, supabaseStatus?.supabaseUrl, supabaseStatus?.supabaseAnonKey]);

  // Real-time polling every 6 seconds to keep Kanbans, Room status, and financial counters synced across all screens
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      Promise.all([
        api.getRooms().then(setRooms).catch(() => {}),
        api.getReservations().then(setReservations).catch(() => {}),
        api.getTasks().then(setTasks).catch(() => {}),
        api.getFinancialStats().then(setStats).catch(() => {}),
        api.getTransactions().then(setTransactions).catch(() => {}),
        api.getSupabaseStatus().then(setSupabaseStatus).catch(() => {}),
        api.getUsers().then(setAllUsers).catch(() => {})
      ]);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  return (
    <HotelContext.Provider
      value={{
        settings,
        rooms,
        guests,
        reservations,
        tasks,
        transactions,
        stats,
        supabaseStatus,
        loading,
        error,
        mode,
        setMode,
        activeAdminTab,
        setActiveAdminTab,
        refreshData,
        updateSettings,
        currentUser,
        allUsers,
        isImpersonating,
        login,
        bootstrapAdmin,
        registerStaff,
        logout,
        switchUser,
        revertToAdminUser,
        createUser,
        updateUser,
        deleteUser,
        hasPermission,
        canAccessTab
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};


import { createClient } from '@supabase/supabase-js';
import { Guest, PermissionKey, StaffUser, UserRole, UserSector } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

const DEFAULT_SUPABASE_URL = 'https://izuymcuzbggrdkezwxyu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3x35e1xKYzhP3PTGxMGAOA_W6QCq2P8';
const DEFAULT_AUTH_REDIRECT_URL = 'https://mgteixeira2112.github.io/tudo-novo/';

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

function mapGuest(row: any): Guest {
  return {
    id: row.id,
    fullName: row.full_name || '',
    document: row.document || '',
    documentType: (row.document_type || 'CPF') as Guest['documentType'],
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    birthDate: row.birth_date || undefined,
    preferences: row.preferences || '',
    allergiesNotes: row.allergies_notes || '',
    status: (row.status || 'Ativo') as Guest['status'],
    totalStays: Number(row.total_stays || 0),
    totalSpent: Number(row.total_spent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function guestPayload(input: Partial<Guest>) {
  const payload: Record<string, any> = {};
  const mapping: Record<string, string> = {
    fullName: 'full_name', document: 'document', documentType: 'document_type', email: 'email',
    phone: 'phone', address: 'address', city: 'city', state: 'state', birthDate: 'birth_date',
    preferences: 'preferences', allergiesNotes: 'allergies_notes', status: 'status'
  };
  Object.entries(mapping).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[column] = (input as any)[key] || null;
  });
  return payload;
}

export async function loadGuestsCloud(): Promise<Guest[]> {
  const { data, error } = await client().from('guests').select('*').order('full_name');
  if (error) throw error;
  return (data || []).map(mapGuest);
}

export async function createGuestCloud(input: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'totalStays' | 'totalSpent'>): Promise<Guest> {
  const id = `guest_${crypto.randomUUID().replace(/-/g, '')}`;
  const { data, error } = await client().from('guests').insert({ id, ...guestPayload(input) }).select('*').single();
  if (error) throw error;
  return mapGuest(data);
}

export async function updateGuestCloud(id: string, input: Partial<Guest>): Promise<Guest> {
  const { data, error } = await client().from('guests').update({ ...guestPayload(input), updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return mapGuest(data);
}

export async function deleteGuestCloud(id: string): Promise<void> {
  const { error } = await client().from('guests').delete().eq('id', id);
  if (error) throw error;
}

function mapStaff(row: any): StaffUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || row.email,
    role: row.role as UserRole,
    sector: row.sector as UserSector,
    status: row.active === false ? 'Inativo' : 'Ativo',
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    supabaseAuthId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function loadStaffCloud(): Promise<StaffUser[]> {
  const { data, error } = await client().from('staff_users').select('*').order('full_name');
  if (error) throw error;
  return (data || []).map(mapStaff);
}

export async function updateStaffCloud(id: string, updates: {
  fullName?: string;
  role?: UserRole;
  sector?: UserSector;
  status?: 'Ativo' | 'Inativo' | 'Bloqueado';
  permissions?: PermissionKey[];
}): Promise<StaffUser> {
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.sector !== undefined) payload.sector = updates.sector;
  if (updates.status !== undefined) payload.active = updates.status === 'Ativo';
  if (updates.permissions !== undefined) payload.permissions = updates.permissions;
  const { data, error } = await client().from('staff_users').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return mapStaff(data);
}

export async function deactivateStaffCloud(id: string): Promise<StaffUser> {
  return updateStaffCloud(id, { status: 'Inativo' });
}

export async function createStaffCloud(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  sector: UserSector;
  permissions: PermissionKey[];
}): Promise<{ user: StaffUser; requiresEmailConfirmation: boolean }> {
  if (!input.password || input.password.length < 6) throw new Error('Informe uma senha inicial com pelo menos 6 caracteres.');

  const normalizedEmail = input.email.trim().toLowerCase();
  const { data: existingProfile, error: existingError } = await client()
    .from('staff_users')
    .select('id,email,full_name')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingProfile) {
    throw new Error('Este e-mail já está cadastrado na equipe. Use outro e-mail ou edite o colaborador existente.');
  }

  const url = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const isolated = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data: authData, error: authError } = await isolated.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: { full_name: input.fullName, role: input.role, sector: input.sector },
      emailRedirectTo: DEFAULT_AUTH_REDIRECT_URL
    }
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Não foi possível criar a conta de autenticação.');

  const { data: row, error: profileError } = await client().from('staff_users').insert({
    id: authData.user.id,
    email: normalizedEmail,
    full_name: input.fullName.trim(),
    role: input.role,
    sector: input.sector,
    permissions: input.permissions,
    active: true
  }).select('*').single();

  if (profileError) {
    if (profileError.code === '23505') {
      throw new Error('Este e-mail já está cadastrado na equipe. Use outro e-mail ou edite o colaborador existente.');
    }
    throw profileError;
  }
  return { user: mapStaff(row), requiresEmailConfirmation: !authData.session };
}

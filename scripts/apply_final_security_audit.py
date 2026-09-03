from pathlib import Path

# ---- HotelContext hardening ----
p = Path('src/context/HotelContext.tsx')
s = p.read_text()

# Replace registerStaff implementation with a safe backend-only flow.
start = s.index('  const registerStaff = async (data: {')
end = s.index('\n  const logout = async () => {', start)
new_register = '''  const registerStaff = async (data: {
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
'''
s = s[:start] + new_register + s[end:]

# Disable client-side impersonation because the bearer token remains the admin token.
start = s.index('  // Impersonate / switch user to quickly test and review sectoral views')
end = s.index('\n  const createUser = async', start)
new_impersonation = '''  // Security: client-side impersonation is disabled.
  // Changing only currentUser while keeping the administrator Bearer token would make
  // server-side authorization continue to run with administrator privileges.
  const switchUser = (_userOrId: StaffUser | string) => {
    setError('Impersonação desativada por segurança. Use uma conta real do perfil para testar permissões.');
  };

  const revertToAdminUser = () => {
    setIsImpersonating(false);
    setOriginalAdminUser(null);
  };
'''
s = s[:start] + new_impersonation + s[end:]

# Remove unsafe fallback after deleting current user. Force logout instead.
old_delete = '''  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser?.id === id) {
      const fallback = allUsers.find(u => u.id !== id && u.role === 'admin') || allUsers[0];
      if (fallback) setCurrentUser(fallback);
    }
  };'''
new_delete = '''  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser?.id === id) {
      await logout();
    }
  };'''
if old_delete not in s:
    raise SystemExit('deleteUser anchor not found')
s = s.replace(old_delete, new_delete)

p.write_text(s)

# ---- Server hardening ----
p = Path('server.ts')
s = p.read_text()

old_delete_route = '''app.delete('/api/users/:id', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const success = dbManager.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }'''
new_delete_route = '''app.delete('/api/users/:id', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const authUser = (req as Request & { authUser?: { staffUser?: any } }).authUser;
    if (authUser?.staffUser?.id === req.params.id) {
      return res.status(400).json({ error: 'Não é permitido excluir o próprio usuário autenticado.' });
    }
    const success = dbManager.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }'''
if old_delete_route not in s:
    raise SystemExit('delete route anchor not found')
s = s.replace(old_delete_route, new_delete_route)

p.write_text(s)

# ---- Audit report ----
server = Path('server.ts').read_text()
public_routes = []
for line in server.splitlines():
    stripped = line.strip()
    if stripped.startswith('app.') and "'/api/" in stripped:
        # Public when route declaration has no auth middleware in the declaration line.
        if 'requireSupabaseAuth' not in stripped:
            public_routes.append(stripped)

Path('docs/FASE-01-07-AUDITORIA-FINAL-SEGURANCA.md').write_text(
    '# FASE 1.7 — Auditoria final de segurança\n\n'
    '## Correções\n\n'
    '- Impersonação client-side desativada: trocar apenas o usuário visual mantinha o Bearer token de administrador.\n'
    '- Removido fallback automático para outro usuário após exclusão.\n'
    '- Backend impede exclusão do próprio usuário autenticado.\n'
    '- Corrigido `registerStaff` para retornar `result.user` e não uma variável inexistente.\n'
    '- Provisionamento de colaboradores não tenta mais criar Supabase Auth diretamente pelo navegador administrativo.\n\n'
    '## Rotas sem `requireSupabaseAuth` na declaração\n\n'
    + ''.join(f'- `{r}`\n' for r in public_routes)
    + '\nAs rotas públicas devem ficar limitadas a health check, apresentação pública do hotel, reserva online, cardápio público, pedido público explicitamente validado e login.\n'
)

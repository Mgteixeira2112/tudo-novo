# FASE 1.7 — Auditoria final de segurança

## Correções

- Impersonação client-side desativada: trocar apenas o usuário visual mantinha o Bearer token de administrador.
- Removido fallback automático para outro usuário após exclusão.
- Backend impede exclusão do próprio usuário autenticado.
- Corrigido `registerStaff` para retornar `result.user` e não uma variável inexistente.
- Provisionamento de colaboradores não tenta mais criar Supabase Auth diretamente pelo navegador administrativo.

## Rotas sem `requireSupabaseAuth` na declaração

- `app.get('/api/health', (req: Request, res: Response) => {`
- `app.get('/api/public/settings', (req: Request, res: Response) => {`
- `app.post('/api/reservations', publicReservationLimiter, (req: Request, res: Response) => {`
- `app.get('/api/kitchen/menu', (req: Request, res: Response) => {`
- `app.post('/api/kitchen/orders', publicRoomServiceLimiter, (req: Request, res: Response) => {`
- `app.post('/api/auth/login', async (req: Request, res: Response) => {`

As rotas públicas devem ficar limitadas a health check, apresentação pública do hotel, reserva online, cardápio público, pedido público explicitamente validado e login.

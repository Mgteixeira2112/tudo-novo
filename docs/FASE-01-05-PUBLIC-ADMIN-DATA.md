# FASE 1.5 — Separação de dados públicos e administrativos

- /api/public/settings entrega apenas campos sanitizados.
- Dados operacionais exigem autenticação/permissão.
- Realtime e polling operacional só rodam para colaborador autenticado.
- POST de reserva online permanece público.

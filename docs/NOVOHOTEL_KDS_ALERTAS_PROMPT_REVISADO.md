# NovoHotel — Prompt revisado de implementação

## KDS por Link + Central de Alertas Operacionais

### Princípio arquitetural congelado

Implementar dois módulos independentes:

1. **Central de Alertas Operacionais** — responde quem precisa saber o que aconteceu.
2. **KDS por Link** — responde o que precisa permanecer visível na operação.

KDS não depende da Central de Alertas e a Central de Alertas não depende do KDS.

## Adaptações obrigatórias ao estado real do NovoHotel

- A arquitetura atual é **uma instalação = um hotel**.
- **Não implementar `hotel_id` nesta iniciativa.** Novas tabelas devem ser simples o suficiente para receber esse campo futuramente sem exigir refatoração destrutiva.
- Reaproveitar `staff_users`, `sector`, `permissions`, Supabase Auth, RLS e Realtime existentes.
- Não criar uma nova camada de usuários, setores, autenticação ou RBAC.
- Preservar o layout e a paleta atuais.
- Não reescrever Recepção, Governança, Manutenção, Room Service, Tarefas, reservas, financeiro ou estoque.
- Integrar módulos de origem por funções/serviços pequenos e centralizados.
- Manter o Kanban de Quartos fora do ciclo de arquivamento de tarefas.

## FASE 0 — Auditoria concluída

### Inventário real

- `src/App.tsx`
  - concentra navegação de alto nível e subscriptions globais;
  - já possui toast específico de Room Service;
  - já assina Realtime de `kitchen_orders` e `rooms`.
- `src/components/Navbar.tsx`
  - barra principal atual; local previsto para sininho global.
- `src/components/RoomServiceNotificationToast.tsx`
  - referência visual a generalizar futuramente como `OperationalAlert`.
- `src/components/KanbanBoard.tsx` / `KanbanWorkspace.tsx`
  - módulo de tarefas já possui histórico e `completed_at`;
  - tarefas continuam fonte da verdade e alertas apenas apontarão para elas.
- `src/components/MinibarAndKitchen.tsx`
  - origem atual de pedidos de cozinha/Room Service.
- `src/components/ReceptionManager.tsx`, dashboards setoriais e fluxos de checkout/check-in
  - origens futuras de eventos operacionais.
- `src/services/rbac.ts`
  - RBAC atual baseado em `staff_users.permissions` e `staff_users.sector`.
- `src/services/supabase.ts`, `roomsRealtime.ts`, `pagesData.ts`
  - padrões existentes de Supabase/Reatime a reutilizar.
- Banco atual
  - `staff_users`, `kanban_tasks`, `kitchen_orders`, `rooms` já existem;
  - `kanban_tasks`, `kitchen_orders` e `rooms` já estão na publicação `supabase_realtime`;
  - não existem tabelas de notificações, alertas ou KDS;
  - não existe `hotel_id`.

### Riscos identificados

1. Não duplicar o estado de tarefas/pedidos dentro de notificações.
2. Evitar subscriptions globais duplicadas no `App.tsx`.
3. Não transformar o toast atual de Room Service em dependência estrutural da Central.
4. Não introduzir multi-hotel de forma indireta.
5. Não permitir que clientes escrevam destinatários diretamente.
6. KDS público por token deverá ler somente o escopo daquela tela, sem sessão administrativa.

## Plano de execução revisado

### PR 1 — Fundação da Central de Alertas

Criar somente:

- `operational_notifications`
- `notification_recipients`
- `user_notification_preferences`
- índices, constraints e RLS

Sem UI e sem integração com módulos de origem.

Critério: dados isolados por usuário, nenhum acesso anônimo e nenhuma escrita direta em destinatários.

### PR 2 — Motor de destinatários + serviço central

Criar `createOperationalNotification` / RPC equivalente.

Regra congelada:

- responsável somente → responsável;
- setor somente → todos os usuários ativos do setor;
- responsável + setor → união sem duplicidade;
- exigir ao menos responsável ou setor, salvo eventos sistêmicos explicitamente permitidos.

Módulos de origem nunca escrevem diretamente em `notification_recipients`.

### PR 3 — Sininho global + Realtime + lida/não lida + silenciar

- sininho no Navbar;
- contador individual;
- lista recente;
- marcar como lida;
- preferência `alerts_muted` por usuário;
- silenciar somente som/toast/popup, nunca recebimento/histórico;
- uma única subscription de notificações por sessão.

### PR 4 — Central de Alertas completa

Tela própria na navegação, com filtros iniciais:

- Todas
- Não lidas
- Lidas

Cada alerta mantém `source_type/source_id` e pode abrir a origem sem copiar o estado dela.

### PR 5 — Integrações iniciais

Adicionar eventos relevantes, nesta ordem:

1. Room Service / Cozinha
2. Tarefas
3. Governança
4. Manutenção
5. Recepção

Não alertar alterações triviais.

### PR 6 — Testes e homologação da Central

Validar destinatários, deduplicação, RLS, Realtime, leitura individual, mute e falha isolada.

Somente depois iniciar KDS.

### PR 7 — Fundação KDS + segurança por token

Criar `kds_screens` com:

- nome
- setor
- token forte e revogável
- ativo/inativo
- orientação
- densidade
- fonte
- colunas
- cabeçalho
- mostrar concluídos
- destaque de atrasos/prioridade
- `last_seen`

Sem `hotel_id` nesta versão.

### PR 8 — Configurações > Telas KDS

Painel administrativo com:

- Nome
- Setor
- Status
- Último sinal
- Criar
- Copiar link
- Abrir link
- Configurar
- Ativar/Desativar

### PR 9 — Link KDS + heartbeat + presets

- rota limpa, sem Navbar/sidebar administrativa;
- link somente se token válido e tela ativa;
- heartbeat a cada 30–60s;
- Online/Offline por limite simples;
- presets visuais controlados;
- sem editor livre, drag-and-drop, QR Code, PIN ou app de TV.

### PR 10 — Testes e homologação KDS

Validar desktop, tablet/TV, token inválido, desativação, heartbeat e independência da Central.

## Fora de escopo

- multi-hotel / `hotel_id`
- push browser
- WhatsApp
- SMS
- e-mail automático
- CC/listas manuais
- escalonamento/snooze/SLA complexo
- aplicativo de Smart TV
- QR Code/PIN/pareamento
- controle remoto/volume/reboot/screenshot
- editor visual livre

## Regra de execução

Cada PR deve ser pequena, auditável e reversível. Não avançar para a próxima se CI, Pages, Supabase ou teste funcional estiverem quebrados. A homologação exige teste real e conferência no banco.
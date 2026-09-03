# FASE 1.4 — Fechamento de mutações operacionais

Checkpoint de segurança do Plano Mestre.

## Aplicado

- Mutação de hóspedes exige `manage_guests`.
- Mutação de quartos exige `manage_rooms`.
- Alteração de reservas, check-in e checkout exige `manage_checkinout`.
- Mutação de frigobar e atualização de status de pedidos exige `manage_fnb`.
- Criação/alteração/exclusão de tarefas exige ao menos uma sessão Supabase válida; a autorização setorial será refinada posteriormente.
- Criação de transações financeiras exige `manage_financial`.
- Leitura de inventário exige `view_inventory`; mutações exigem `manage_inventory`.
- SQL de schema e reconexão Supabase exigem `manage_settings`.
- O cliente passa a encaminhar Bearer token nas operações JSON e exclusões quando houver sessão.
- Login não cria mais automaticamente um perfil de recepcionista para qualquer identidade válida no Supabase Auth.
- Cadastro administrativo não retorna mais token sintético/falso.

## Mantido público propositalmente neste checkpoint

Alguns `GETs` operacionais continuam públicos porque o `HotelContext` ainda carrega dados públicos e administrativos no mesmo fluxo inicial. Fechá-los agora quebraria a experiência pública. O próximo checkpoint deve separar o carregamento público do carregamento autenticado e então proteger os `GETs` administrativos restantes.

## Validação

Foi executado `npm run build` completo em Node 22, incluindo Vite e bundle do `server.ts`, com resultado verde antes da abertura da PR.

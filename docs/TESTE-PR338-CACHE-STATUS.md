# Homologação específica — PR #338

Este documento não constitui evidência de testes executados. A CI existente valida build e testes gerais, mas ainda não testa o cache diretamente.

## Casos obrigatórios

1. Chamar `loadSupabaseStatusCloud` duas vezes simultaneamente; confirmar somente seis contagens totais (deduplicação in-flight).
2. Repetir chamadas dentro de 60 segundos; confirmar nenhuma nova consulta de contagem.
3. Avançar relógio além de 60 segundos; confirmar seis novas contagens e valores atualizados.
4. Simular falha de autorização/rede ou `count === null`; confirmar rejeição e ausência de cache de zero falso.
5. Alternar usuário durante uma consulta pendente; garantir que o resultado da sessão antiga não entre no cache **nem seja entregue ao estado da sessão nova**. ATENÇÃO: no commit fb290249 o resultado antigo ainda é retornado ao chamador, apesar de não ser armazenado no cache. Corrigir essa condição antes do merge.
6. Sair e entrar com outra conta; confirmar invalidação de cache, respeito a RBAC e novas contagens.
7. Confirmar que reservas, quartos, tarefas, finanças e KDS continuam sincronizados como antes.
8. Medir chamadas e bytes no Network e Usage antes/depois sob carga equivalente. Não compartilhar tokens, cabeçalhos de autorização ou dados de hóspedes.

## Portão de aprovação

Não fazer merge enquanto os casos 1–7 não forem automatizados ou comprovados com evidência e o caso 8 não tiver medição confiável. CI verde genérica não basta para homologar esta otimização.

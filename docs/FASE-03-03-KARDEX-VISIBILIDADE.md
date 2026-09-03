# FASE 3.3 — Kardex e visibilidade de setores

## Diagnóstico

Durante a homologação da FASE 3.3 foram identificados dois comportamentos distintos:

1. A navegação de setores do Controle de Estoque usava overflow horizontal com scrollbar oculta. Em larguras menores, a opção final podia parecer cortada ou inexistente.
2. O Kardex respeita o setor selecionado. Assim, com `Manutencao` selecionado, movimentações de `Frigobar` ou `Almoxarifado` não são exibidas.

## Consumo de quarto sem Kardex

O lançamento funcional realizado no quarto 202 foi persistido em `room_consumptions`, porém o item de frigobar utilizado não possui item correspondente em `inventory_items` com `linked_minibar_item_id`.

A RPC `register_minibar_consumption_atomic` somente baixa o inventário integrado e cria `stock_movements` quando esse vínculo existe. Portanto, a ausência do lançamento no Kardex nesse teste não representa perda do consumo nem falha transacional.

## Correção visual

A barra de setores passa a permitir quebra de linha e mantém todas as opções visíveis, sem depender de scroll horizontal oculto.

## Homologação pendente

Para validar o caminho completo Frigobar -> Inventário -> Kardex, usar um item que possua `linked_minibar_item_id`, atualmente Água Mineral sem Gás 500ml (`mb_01`).

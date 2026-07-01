-- Remove produtos importados em bulk do Open Food Facts.
-- Produtos adicionados individualmente via scanner serão re-adicionados
-- automaticamente quando o usuário escanear o código de barras novamente.
DELETE FROM public.foods WHERE source = 'open_food_facts';

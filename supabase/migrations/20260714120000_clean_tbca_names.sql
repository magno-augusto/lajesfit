-- Limpa nomes da TBCA importados: remove listas de ingredientes entre
-- parenteses e virgulas soltas no final.
-- "Pizza, massa, assada, (farinha de trigo, oleo, ...)" -> "Pizza, massa, assada"
UPDATE public.foods
SET name = regexp_replace(regexp_replace(name, '\s*\(.*$', ''), '[,\s]+$', '')
WHERE source = 'tbca' AND name ~ '\(';

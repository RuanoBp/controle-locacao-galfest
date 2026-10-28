-- ============================================================================
-- SCRIPT DE ROLLBACK: REVERTER O MODELO DIMENSIONAL (0002_bi_star_schema.sql)
-- Executar no SQL Editor do Supabase se desejar remover as tabelas/views de BI
-- ============================================================================

-- 1. Remove as views analíticas criadas para o BI
drop view if exists public.v_bi_fato_completa cascade;
drop view if exists public.fato_locacao cascade;
drop view if exists public.dim_cliente cascade;
drop view if exists public.dim_item cascade;

-- 2. Remove o trigger e a função de sincronização de categorias
drop trigger if exists trg_sync_categoria_item on public.itens;
drop function if exists public.sync_categoria_item();

-- 3. Remove as tabelas dimensionais criadas exclusivamente para o BI
drop table if exists public.dim_data_calendario cascade;
drop table if exists public.dim_status_locacao cascade;
drop table if exists public.dim_categoria_item cascade;
drop table if exists public.dim_tipo_cliente cascade;

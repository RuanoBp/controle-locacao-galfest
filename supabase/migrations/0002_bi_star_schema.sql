-- ============================================================================
-- MIGRAÇÃO 0002: MODELO DIMENSIONAL (STAR SCHEMA) PARA BI
-- Sistema de Controle de Locação Galfest
-- ============================================================================

-- 1. Dimensão: dim_tipo_cliente (Tabela física com os perfis de cliente)
create table if not exists public.dim_tipo_cliente (
  id_tipo_cliente serial primary key,
  descricao varchar(50) not null unique
);

insert into public.dim_tipo_cliente (descricao)
values
  ('Pessoa Física'),
  ('Pessoa Jurídica'),
  ('Cerimonialista'),
  ('Buffet'),
  ('Casa de Festas'),
  ('Outro')
on conflict (descricao) do nothing;

-- 2. Dimensão: dim_categoria_item (Tabela física com categorias de produtos)
create table if not exists public.dim_categoria_item (
  id_categoria serial primary key,
  nome_categoria varchar(50) not null unique
);

-- Insere as categorias já existentes na tabela de itens
insert into public.dim_categoria_item (nome_categoria)
select distinct trim(categoria)
from public.itens
where categoria is not null and trim(categoria) <> ''
on conflict (nome_categoria) do nothing;

-- Trigger para adicionar novas categorias automaticamente quando novos itens forem cadastrados
create or replace function public.sync_categoria_item()
returns trigger
language plpgsql
as $$
begin
  if new.categoria is not null and trim(new.categoria) <> '' then
    insert into public.dim_categoria_item (nome_categoria)
    values (trim(new.categoria))
    on conflict (nome_categoria) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_categoria_item on public.itens;
create trigger trg_sync_categoria_item
  after insert or update of categoria on public.itens
  for each row execute function public.sync_categoria_item();

-- 3. Dimensão: dim_status_locacao (Tabela física com os status do ciclo de vida)
create table if not exists public.dim_status_locacao (
  id_status serial primary key,
  descricao_status varchar(50) not null unique
);

insert into public.dim_status_locacao (descricao_status)
values
  ('Orçamento'),
  ('Confirmada'),
  ('Entregue'),
  ('Recolhida'),
  ('Atrasada'),
  ('Cancelada')
on conflict (descricao_status) do nothing;

-- 4. Dimensão: dim_data_calendario (Tabela física gerada de 2020 a 2035)
create table if not exists public.dim_data_calendario (
  id_data int primary key, -- Formato YYYYMMDD
  data_completa date not null unique,
  ano int not null,
  mes int not null,
  nome_mes varchar(20) not null,
  dia_mes int not null,
  dia_semana varchar(20) not null,
  trimestre int not null,
  semana_ano int not null
);

-- Popula o calendário de 2020 até 2035 com nomes em português
insert into public.dim_data_calendario
select
  to_char(d, 'YYYYMMDD')::int as id_data,
  d::date as data_completa,
  extract(year from d)::int as ano,
  extract(month from d)::int as mes,
  case extract(month from d)::int
    when 1 then 'Janeiro'
    when 2 then 'Fevereiro'
    when 3 then 'Março'
    when 4 then 'Abril'
    when 5 then 'Maio'
    when 6 then 'Junho'
    when 7 then 'Julho'
    when 8 then 'Agosto'
    when 9 then 'Setembro'
    when 10 then 'Outubro'
    when 11 then 'Novembro'
    when 12 then 'Dezembro'
  end as nome_mes,
  extract(day from d)::int as dia_mes,
  case extract(isodow from d)::int
    when 1 then 'Segunda-feira'
    when 2 then 'Terça-feira'
    when 3 then 'Quarta-feira'
    when 4 then 'Quinta-feira'
    when 5 then 'Sexta-feira'
    when 6 then 'Sábado'
    when 7 then 'Domingo'
  end as dia_semana,
  extract(quarter from d)::int as trimestre,
  extract(week from d)::int as semana_ano
from generate_series('2020-01-01'::date, '2035-12-31'::date, '1 day'::interval) d
on conflict (id_data) do nothing;

create index if not exists dim_data_calendario_ano_mes_idx on public.dim_data_calendario (ano, mes);
create index if not exists dim_data_calendario_trimestre_idx on public.dim_data_calendario (ano, trimestre);

-- 5. View Dimensional: dim_cliente
create or replace view public.dim_cliente
with (security_invoker = true) as
select
  c.id as id_cliente,
  c.nome::varchar(100) as nome,
  c.telefone::varchar(20) as telefone,
  coalesce(tc.id_tipo_cliente, 1) as id_tipo_cliente
from public.clientes c
left join public.dim_tipo_cliente tc on tc.descricao = c.tipo;

-- 6. View Dimensional: dim_item
create or replace view public.dim_item
with (security_invoker = true) as
select
  i.id as id_item,
  i.nome::varchar(100) as nome_item,
  i.estoque_total as quantidade_total,
  i.preco_diaria::decimal(10,2) as preco_base_diaria,
  i.custo_aquisicao::decimal(10,2) as custo_aquisicao,
  coalesce(cat.id_categoria, 1) as id_categoria
from public.itens i
left join public.dim_categoria_item cat on cat.nome_categoria = trim(i.categoria);

-- 7. View de Fato: fato_locacao
-- Incorpora status 'Atrasada' dinamicamente se a data de recolhimento venceu e status não é Recolhida/Cancelada
create or replace view public.fato_locacao
with (security_invoker = true) as
select
  ia.id as id,
  l.id as id_locacao,
  l.cliente_id as id_cliente,
  to_char(l.data, 'YYYYMMDD')::int as id_data_cadastro,
  to_char(l.data_entrega, 'YYYYMMDD')::int as id_data_entrega,
  to_char(l.data_recolher, 'YYYYMMDD')::int as id_data_recolhimento,
  case
    when l.status in ('Recolhida', 'Cancelada') then coalesce(sl.id_status, 1)
    when l.data_recolher < current_date then (
      select id_status from public.dim_status_locacao where descricao_status = 'Atrasada'
    )
    else coalesce(sl.id_status, 1)
  end as id_status,
  ia.item_id as id_item,
  ia.quantidade as quantidade,
  ia.preco_diaria::numeric(12,2) as preco_diaria,
  (
    ia.quantidade * ia.preco_diaria * greatest(1, (l.data_recolher - l.data_entrega))
  )::numeric(12,2) as valor_item
from public.itens_alugados ia
join public.locacoes l on l.id = ia.locacao_id
left join public.dim_status_locacao sl on sl.descricao_status = l.status;

-- 8. View Consolidada de BI (Une a fato às dimensões para consultas analíticas simplificadas no Next.js)
create or replace view public.v_bi_fato_completa
with (security_invoker = true) as
select
  f.id,
  f.id_locacao,
  f.id_cliente,
  c.nome as cliente_nome,
  c.telefone as cliente_telefone,
  tc.id_tipo_cliente,
  tc.descricao as tipo_cliente,
  f.id_item,
  i.nome_item,
  cat.id_categoria,
  cat.nome_categoria,
  f.id_status,
  sl.descricao_status as status,
  f.quantidade,
  f.preco_diaria,
  f.valor_item,
  f.id_data_cadastro,
  f.id_data_entrega,
  f.id_data_recolhimento,
  d_entrega.data_completa as data_entrega,
  d_entrega.ano as ano_entrega,
  d_entrega.mes as mes_entrega,
  d_entrega.nome_mes as nome_mes_entrega,
  d_entrega.trimestre as trimestre_entrega,
  d_entrega.dia_semana as dia_semana_entrega,
  d_recolhimento.data_completa as data_recolhimento
from public.fato_locacao f
left join public.dim_cliente c on c.id_cliente = f.id_cliente
left join public.dim_tipo_cliente tc on tc.id_tipo_cliente = c.id_tipo_cliente
left join public.dim_item i on i.id_item = f.id_item
left join public.dim_categoria_item cat on cat.id_categoria = i.id_categoria
left join public.dim_status_locacao sl on sl.id_status = f.id_status
left join public.dim_data_calendario d_entrega on d_entrega.id_data = f.id_data_entrega
left join public.dim_data_calendario d_recolhimento on d_recolhimento.id_data = f.id_data_recolhimento;

-- 9. Permissões de Leitura e Segurança (RLS)
alter table public.dim_tipo_cliente enable row level security;
alter table public.dim_categoria_item enable row level security;
alter table public.dim_status_locacao enable row level security;
alter table public.dim_data_calendario enable row level security;

drop policy if exists "authenticated_select_dim_tipo_cliente" on public.dim_tipo_cliente;
create policy "authenticated_select_dim_tipo_cliente" on public.dim_tipo_cliente
  for select to authenticated using (true);

drop policy if exists "authenticated_select_dim_categoria_item" on public.dim_categoria_item;
create policy "authenticated_select_dim_categoria_item" on public.dim_categoria_item
  for select to authenticated using (true);

drop policy if exists "authenticated_select_dim_status_locacao" on public.dim_status_locacao;
create policy "authenticated_select_dim_status_locacao" on public.dim_status_locacao
  for select to authenticated using (true);

drop policy if exists "authenticated_select_dim_data_calendario" on public.dim_data_calendario;
create policy "authenticated_select_dim_data_calendario" on public.dim_data_calendario
  for select to authenticated using (true);

-- Garante acesso somente para authenticated
revoke all on public.dim_tipo_cliente, public.dim_categoria_item,
  public.dim_status_locacao, public.dim_data_calendario,
  public.dim_cliente, public.dim_item, public.fato_locacao,
  public.v_bi_fato_completa from anon;

grant select on public.dim_tipo_cliente, public.dim_categoria_item,
  public.dim_status_locacao, public.dim_data_calendario,
  public.dim_cliente, public.dim_item, public.fato_locacao,
  public.v_bi_fato_completa
  to authenticated;

-- Sistema de Controle de Locação de Utensílios para Eventos
-- Schema inicial: itens, clientes, locações, itens_alugados
-- Rode este arquivo no SQL Editor do seu projeto Supabase (Dashboard > SQL Editor > New query)

-- ==========================================================================
-- Tabela: itens
-- ==========================================================================
create table if not exists public.itens (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(trim(nome)) > 0),
  categoria text not null,
  estoque_total integer not null check (estoque_total >= 0),
  preco_diaria numeric(12, 2) not null check (preco_diaria >= 0),
  custo_aquisicao numeric(12, 2) not null default 0 check (custo_aquisicao >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- Tabela: clientes
-- ==========================================================================
create table if not exists public.clientes (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(trim(nome)) > 0),
  tipo text not null default 'Pessoa Física',
  cidade_bairro text,
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- Tabela: locacoes
-- ==========================================================================
create table if not exists public.locacoes (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes (id) on delete restrict,
  data date not null default current_date,
  data_entrega date not null,
  data_recolher date not null,
  status text not null default 'Orçamento'
    check (status in ('Orçamento', 'Confirmada', 'Entregue', 'Recolhida', 'Atrasada', 'Cancelada')),
  valor_frete numeric(12, 2) not null default 0 check (valor_frete >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint datas_validas check (data_recolher >= data_entrega)
);

create index if not exists locacoes_cliente_id_idx on public.locacoes (cliente_id);
create index if not exists locacoes_datas_idx on public.locacoes (data_entrega, data_recolher);
create index if not exists locacoes_status_idx on public.locacoes (status);

-- ==========================================================================
-- Tabela: itens_alugados (N:N entre locacoes e itens)
-- ==========================================================================
create table if not exists public.itens_alugados (
  id bigint generated always as identity primary key,
  locacao_id bigint not null references public.locacoes (id) on delete cascade,
  item_id bigint not null references public.itens (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_diaria numeric(12, 2) not null check (preco_diaria >= 0),
  created_at timestamptz not null default now()
);

create index if not exists itens_alugados_locacao_id_idx on public.itens_alugados (locacao_id);
create index if not exists itens_alugados_item_id_idx on public.itens_alugados (item_id);

-- ==========================================================================
-- updated_at automático
-- ==========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.itens;
create trigger set_updated_at before update on public.itens
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.clientes;
create trigger set_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.locacoes;
create trigger set_updated_at before update on public.locacoes
  for each row execute function public.set_updated_at();

-- ==========================================================================
-- Função: quantidade de um item já comprometida em locações que se sobrepõem
-- a um período (usada para checar disponibilidade antes de fechar uma locação)
-- ==========================================================================
create or replace function public.estoque_comprometido(
  p_item_id bigint,
  p_data_entrega date,
  p_data_recolher date,
  p_excluir_locacao_id bigint default null
)
returns integer
language sql
stable
as $$
  select coalesce(sum(ia.quantidade), 0)::int
  from public.itens_alugados ia
  join public.locacoes l on l.id = ia.locacao_id
  where ia.item_id = p_item_id
    and l.status not in ('Cancelada', 'Recolhida')
    and (p_excluir_locacao_id is null or l.id <> p_excluir_locacao_id)
    and l.data_entrega <= p_data_recolher
    and l.data_recolher >= p_data_entrega
$$;

-- ==========================================================================
-- View: estoque disponível "hoje" (para a listagem de itens / dashboard)
-- ==========================================================================
create or replace view public.v_itens_estoque
with (security_invoker = true) as
select
  i.*,
  public.estoque_comprometido(i.id, current_date, current_date) as comprometido_hoje,
  i.estoque_total - public.estoque_comprometido(i.id, current_date, current_date) as disponivel_hoje
from public.itens i;

-- ==========================================================================
-- View: valor total de cada locação (itens x diárias + frete)
-- ==========================================================================
create or replace view public.v_locacoes_valor
with (security_invoker = true) as
select
  l.id as locacao_id,
  coalesce(sum(
    ia.quantidade * ia.preco_diaria * greatest(1, (l.data_recolher - l.data_entrega))
  ), 0)::numeric(12, 2) as valor_itens,
  l.valor_frete,
  (
    coalesce(sum(
      ia.quantidade * ia.preco_diaria * greatest(1, (l.data_recolher - l.data_entrega))
    ), 0) + l.valor_frete
  )::numeric(12, 2) as valor_total
from public.locacoes l
left join public.itens_alugados ia on ia.locacao_id = l.id
group by l.id, l.valor_frete;

-- ==========================================================================
-- View: itens mais alugados (soma histórica de quantidade em todas as
-- locações não canceladas) — usada no card "maior taxa de utilização"
-- ==========================================================================
create or replace view public.v_itens_mais_alugados
with (security_invoker = true) as
select
  i.id,
  i.nome,
  i.categoria,
  i.estoque_total,
  coalesce(sum(case when l.id is not null then ia.quantidade else 0 end), 0)::int
    as total_alugado,
  case
    when i.estoque_total > 0
      then round(
        coalesce(sum(case when l.id is not null then ia.quantidade else 0 end), 0)::numeric
          / i.estoque_total,
        2
      )
    else 0
  end as taxa_utilizacao
from public.itens i
left join public.itens_alugados ia on ia.item_id = i.id
left join public.locacoes l on l.id = ia.locacao_id and l.status <> 'Cancelada'
group by i.id
order by total_alugado desc;

-- ==========================================================================
-- Row Level Security: só usuários autenticados (você) podem ler/escrever.
-- Não há cadastro público de usuários — o único login é criado manualmente
-- no painel do Supabase (ver README, seção "Criar o usuário administrador").
-- ==========================================================================
alter table public.itens enable row level security;
alter table public.clientes enable row level security;
alter table public.locacoes enable row level security;
alter table public.itens_alugados enable row level security;

drop policy if exists "authenticated_all_itens" on public.itens;
create policy "authenticated_all_itens" on public.itens
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_clientes" on public.clientes;
create policy "authenticated_all_clientes" on public.clientes
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_locacoes" on public.locacoes;
create policy "authenticated_all_locacoes" on public.locacoes
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_itens_alugados" on public.itens_alugados;
create policy "authenticated_all_itens_alugados" on public.itens_alugados
  for all to authenticated using (true) with check (true);

-- Garante que só o papel "authenticated" (login feito) acessa dados/tabelas/views.
-- O papel "anon" (visitante sem login) fica sem nenhuma permissão.
revoke all on public.itens, public.clientes, public.locacoes, public.itens_alugados,
  public.v_itens_estoque, public.v_locacoes_valor, public.v_itens_mais_alugados from anon;
grant select, insert, update, delete on public.itens, public.clientes, public.locacoes, public.itens_alugados
  to authenticated;
grant select on public.v_itens_estoque, public.v_locacoes_valor, public.v_itens_mais_alugados
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.estoque_comprometido(bigint, date, date, bigint) to authenticated;

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatCard, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import {
  formatarMoeda,
  formatarData,
  hojeISO,
  somarDias,
  valorTotalLocacao,
} from "@/lib/calculos";
import type { ItemMaisAlugado } from "@/lib/types";

export const metadata = { title: "Dashboard" };

interface LocacaoProxima {
  id: number;
  data_entrega: string;
  data_recolher: string;
  status: string;
  cliente: { nome: string } | null;
}

export default async function DashboardPage() {
  await requireUser();
  const supabase = await createClient();

  const hoje = hojeISO();
  const em7dias = somarDias(hoje, 7);
  const inicioMes = hoje.slice(0, 8) + "01";

  const [
    itensAgg,
    { count: locacoesAtivas },
    { count: locacoesAtrasadas },
    { data: proximasEntregas },
    { data: proximosRecolhimentos },
    { data: maisAlugados },
    { data: faturamentoRows },
  ] = await Promise.all([
    supabase.from("itens").select("estoque_total, custo_aquisicao"),
    supabase
      .from("locacoes")
      .select("id", { count: "exact", head: true })
      .in("status", ["Confirmada", "Entregue"]),
    supabase
      .from("locacoes")
      .select("id", { count: "exact", head: true })
      .lt("data_recolher", hoje)
      .not("status", "in", "(Recolhida,Cancelada)"),
    supabase
      .from("locacoes")
      .select("id, data_entrega, data_recolher, status, cliente:clientes(nome)")
      .gte("data_entrega", hoje)
      .lte("data_entrega", em7dias)
      .neq("status", "Cancelada")
      .order("data_entrega"),
    supabase
      .from("locacoes")
      .select("id, data_entrega, data_recolher, status, cliente:clientes(nome)")
      .gte("data_recolher", hoje)
      .lte("data_recolher", em7dias)
      .not("status", "in", "(Recolhida,Cancelada)")
      .order("data_recolher"),
    supabase
      .from("v_itens_mais_alugados")
      .select("*")
      .order("total_alugado", { ascending: false })
      .limit(5),
    supabase
      .from("locacoes")
      .select(
        "valor_frete, status, data_entrega, data_recolher, itens_alugados(quantidade, preco_diaria)",
      )
      .gte("data_entrega", inicioMes)
      .not("status", "in", "(Cancelada,Orçamento)"),
  ]);

  const totalItensEstoque =
    itensAgg.data?.reduce((soma, i) => soma + i.estoque_total, 0) ?? 0;
  const valorInvestido =
    itensAgg.data?.reduce(
      (soma, i) => soma + i.estoque_total * i.custo_aquisicao,
      0,
    ) ?? 0;

  const faturamentoMes =
    faturamentoRows?.reduce(
      (soma, l) =>
        soma +
        valorTotalLocacao({
          itens: l.itens_alugados ?? [],
          data_entrega: l.data_entrega,
          data_recolher: l.data_recolher,
          valor_frete: l.valor_frete,
        }),
      0,
    ) ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Itens em estoque"
          value={String(totalItensEstoque)}
          hint={`Valor investido: ${formatarMoeda(valorInvestido)}`}
        />
        <StatCard
          label="Locações ativas"
          value={String(locacoesAtivas ?? 0)}
          hint="Confirmadas ou entregues"
        />
        <StatCard
          label="Locações atrasadas"
          value={String(locacoesAtrasadas ?? 0)}
          tone={(locacoesAtrasadas ?? 0) > 0 ? "danger" : "default"}
          hint="Recolhimento já venceu"
        />
        <StatCard
          label="Faturamento do mês"
          value={formatarMoeda(faturamentoMes)}
          tone="success"
          hint="Locações confirmadas em diante"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Próximas entregas (7 dias)
          </h2>
          <ListaLocacoes locacoes={proximasEntregas as LocacaoProxima[] | null} campoData="data_entrega" />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Próximos recolhimentos (7 dias)
          </h2>
          <ListaLocacoes
            locacoes={proximosRecolhimentos as LocacaoProxima[] | null}
            campoData="data_recolher"
          />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Itens com maior taxa de utilização
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Estimativa: total de unidades já alugadas (histórico) dividido pelo
          estoque total do item.
        </p>
        <div className="space-y-2">
          {(maisAlugados as ItemMaisAlugado[] | null)?.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{item.nome}</span>
              <span className="text-slate-500">
                {item.total_alugado} unid. alugadas · taxa {item.taxa_utilizacao}x
              </span>
            </div>
          ))}
          {(!maisAlugados || maisAlugados.length === 0) && (
            <p className="text-sm text-slate-400">Sem locações registradas ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function ListaLocacoes({
  locacoes,
  campoData,
}: {
  locacoes: LocacaoProxima[] | null;
  campoData: "data_entrega" | "data_recolher";
}) {
  if (!locacoes || locacoes.length === 0) {
    return <p className="text-sm text-slate-400">Nada previsto para os próximos 7 dias.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {locacoes.map((locacao) => (
        <li key={locacao.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <LinkButton
              href={`/locacoes/${locacao.id}/editar`}
              variant="ghost"
              className="!px-0 font-medium text-slate-900 hover:underline"
            >
              {locacao.cliente?.nome ?? "Cliente"}
            </LinkButton>
            <p className="text-xs text-slate-400">
              {formatarData(locacao[campoData])}
            </p>
          </div>
          <StatusBadge status={locacao.status} />
        </li>
      ))}
    </ul>
  );
}

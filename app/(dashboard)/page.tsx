import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatCard, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { BarChart } from "@/components/dashboard/bar-chart";
import {
  estaAtrasada,
  formatarMoeda,
  formatarData,
  hojeISO,
  somarDias,
  valorTotalLocacao,
} from "@/lib/calculos";
import { STATUS_LOCACAO, type ItemMaisAlugado } from "@/lib/types";

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
    { data: statusRows },
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
    supabase.from("locacoes").select("status, data_recolher"),
  ]);

  // "Atrasada" aqui é calculado pela data (recolhimento já vencido e a
  // locação ainda não foi recolhida/cancelada), igual ao card "Locações
  // atrasadas" acima — não pelo texto do status, que pode ainda estar como
  // "Confirmada" ou "Entregue" mesmo já tendo vencido.
  function statusEfetivo(status: string, dataRecolher: string) {
    if (status === "Cancelada" || status === "Recolhida") return status;
    return estaAtrasada(status, dataRecolher) ? "Atrasada" : status;
  }

  const contagemPorStatus = STATUS_LOCACAO.map((status) => ({
    rotulo: status,
    valor:
      statusRows?.filter((l) => statusEfetivo(l.status, l.data_recolher) === status)
        .length ?? 0,
  }));

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">
            Locações por status
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Quantas locações estão em cada etapa (ativas, atrasadas, já
            recolhidas, etc).
          </p>
          <BarChart dados={contagemPorStatus} />
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">
            Itens mais alugados
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Total de unidades já alugadas (histórico), top 5.
          </p>
          <BarChart
            corUnica="#2a78d6"
            dados={
              (maisAlugados as ItemMaisAlugado[] | null)?.map((item) => ({
                rotulo: item.nome,
                valor: item.total_alugado,
              })) ?? []
            }
          />
        </Card>
      </div>
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

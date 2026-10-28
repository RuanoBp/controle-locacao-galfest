import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { formatarData, hojeISO, somarDias } from "@/lib/calculos";
import { buscarDadosBI } from "@/lib/bi/queries";
import { BIFiltros } from "@/components/dashboard/bi-filtros";
import { BIKpis } from "@/components/dashboard/bi-kpis";
import { BIGraficos } from "@/components/dashboard/bi-graficos";

export const metadata = { title: "Dashboard & BI" };

interface LocacaoProxima {
  id: number;
  data_entrega: string;
  data_recolher: string;
  status: string;
  cliente: { nome: string } | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    ano?: string;
    mes?: string;
    trimestre?: string;
    categoria_id?: string;
    tipo_cliente_id?: string;
    status_id?: string;
  }>;
}) {
  await requireUser();
  const filtros = await searchParams;
  const supabase = await createClient();

  const hoje = hojeISO();
  const em7dias = somarDias(hoje, 7);

  // Executa simultaneamente as consultas do BI e as consultas operacionais
  const [
    { dados: dadosBI, erroMigracao },
    { data: proximasEntregas },
    { data: proximosRecolhimentos },
  ] = await Promise.all([
    buscarDadosBI(supabase, filtros),
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
  ]);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard & BI Analítico</h1>
          <p className="text-xs text-slate-500">
            Inteligência de locações, faturamento multidimensional e controle operacional
          </p>
        </div>
      </div>

      {/* Aviso caso a migração do Supabase ainda não tenha sido executada */}
      {erroMigracao && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <h3 className="font-semibold text-sm text-amber-950 flex items-center gap-2">
            ⚠️ Migração do Modelo Dimensional (BI) Pendente no Supabase
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            O arquivo SQL com o Star Schema foi criado em{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
              supabase/migrations/0002_bi_star_schema.sql
            </code>
            . Para habilitar os dados do BI, copie o conteúdo desse arquivo, abra o{" "}
            <strong>SQL Editor</strong> no painel do Supabase e clique em <strong>Run</strong>.
          </p>
        </div>
      )}

      {/* 1. Barra de Filtros Multidimensionais */}
      <BIFiltros
        anos={dadosBI.opcoesFiltros.anos}
        categorias={dadosBI.opcoesFiltros.categorias}
        tiposCliente={dadosBI.opcoesFiltros.tiposCliente}
        statusList={dadosBI.opcoesFiltros.statusList}
      />

      {/* 2. Cards de KPIs Principais */}
      <BIKpis kpis={dadosBI.kpis} />

      {/* 3. Gráficos Analíticos de BI */}
      <BIGraficos
        evolucaoMensal={dadosBI.evolucaoMensal}
        faturamentoPorCategoria={dadosBI.faturamentoPorCategoria}
        faturamentoPorTipoCliente={dadosBI.faturamentoPorTipoCliente}
        locacoesPorStatus={dadosBI.locacoesPorStatus}
        topItens={dadosBI.topItens}
      />

      {/* 4. Painel Operacional Logístico (Próximos 7 dias) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Operação Imediata (Próximos 7 Dias)
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Próximas entregas agendadas
            </h3>
            <ListaLocacoes
              locacoes={proximasEntregas as LocacaoProxima[] | null}
              campoData="data_entrega"
            />
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Próximos recolhimentos agendados
            </h3>
            <ListaLocacoes
              locacoes={proximosRecolhimentos as LocacaoProxima[] | null}
              campoData="data_recolher"
            />
          </Card>
        </div>
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

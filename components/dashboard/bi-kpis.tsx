import { StatCard } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculos";
import type { KpisBI, AbaBI } from "@/lib/bi/types";

export function BIKpis({
  kpis,
  abaAtiva = "financeiro",
}: {
  kpis: KpisBI;
  abaAtiva?: AbaBI;
}) {
  const formatarNumero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

  if (abaAtiva === "operacional") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Volume de Contratos"
          value={String(kpis.totalContratos)}
          tone="default"
          hint="Total de locações no período selecionado"
        />
        <StatCard
          label="Peças / Utensílios Alugados"
          value={formatarNumero(kpis.totalPecasAlugadas)}
          tone="default"
          hint="Volume físico de ativos em circulação"
        />
        <StatCard
          label="Tempo Médio de Locação"
          value={`${kpis.tempoMedioLocacaoDias} ${
            kpis.tempoMedioLocacaoDias === 1 ? "dia" : "dias"
          }`}
          tone="default"
          hint="Duração média que o cliente fica com o item"
        />
        <StatCard
          label="Locações em Atraso"
          value={String(kpis.locacoesAtrasadasQtd)}
          tone={kpis.locacoesAtrasadasQtd > 0 ? "danger" : "default"}
          hint={
            kpis.locacoesAtrasadasQtd > 0
              ? `Tempo médio de atraso: ${kpis.mediaDiasAtraso} dias`
              : "Nenhum atraso registrado"
          }
        />
      </div>
    );
  }

  // Aba 'financeiro' (Padrão)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Faturamento Realizado"
        value={formatarMoeda(kpis.faturamentoTotal)}
        tone="success"
        hint="Receita gerada pelos contratos do período"
      />
      <StatCard
        label="Contratos de Locação"
        value={String(kpis.totalContratos)}
        tone="default"
        hint="Volume de locações únicas no recorte"
      />
      <StatCard
        label="Ticket Médio"
        value={formatarMoeda(kpis.ticketMedio)}
        tone="default"
        hint="Faturamento médio por contrato"
      />
      <StatCard
        label="Diária Média Cobrada"
        value={formatarMoeda(kpis.precoMedioDiaria)}
        tone="default"
        hint="Preço unitário médio praticado por diária"
      />
    </div>
  );
}

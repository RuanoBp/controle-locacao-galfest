import { StatCard } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculos";
import type { KpisBI } from "@/lib/bi/types";

export function BIKpis({ kpis }: { kpis: KpisBI }) {
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
        label="Peças / Utensílios Alugados"
        value={new Intl.NumberFormat("pt-BR").format(kpis.totalPecasAlugadas)}
        tone="default"
        hint="Volume físico de itens movimentados"
      />
      <StatCard
        label="Ticket Médio"
        value={formatarMoeda(kpis.ticketMedio)}
        tone="default"
        hint={`Diária média: ${formatarMoeda(kpis.precoMedioDiaria)}`}
      />
    </div>
  );
}

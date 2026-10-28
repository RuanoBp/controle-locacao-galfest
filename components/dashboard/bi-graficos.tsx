import { Card } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculos";
import type {
  PontoEvolucaoMensal,
  PontoCategoria,
  PontoTipoCliente,
  PontoStatus,
  PontoItemRanking,
} from "@/lib/bi/types";

interface BIGraficosProps {
  evolucaoMensal: PontoEvolucaoMensal[];
  faturamentoPorCategoria: PontoCategoria[];
  faturamentoPorTipoCliente: PontoTipoCliente[];
  locacoesPorStatus: PontoStatus[];
  topItens: PontoItemRanking[];
}

export function BIGraficos({
  evolucaoMensal,
  faturamentoPorCategoria,
  faturamentoPorTipoCliente,
  locacoesPorStatus,
  topItens,
}: BIGraficosProps) {
  const maxMensal = Math.max(1, ...evolucaoMensal.map((m) => m.faturamento));
  const totalCat = faturamentoPorCategoria.reduce((acc, c) => acc + c.faturamento, 0);
  const maxCat = Math.max(1, ...faturamentoPorCategoria.map((c) => c.faturamento));
  const maxTipo = Math.max(1, ...faturamentoPorTipoCliente.map((t) => t.faturamento));

  return (
    <div className="space-y-6">
      {/* 1. Evolução Temporal de Faturamento (Mês a Mês) */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Evolução Temporal do Faturamento
            </h3>
            <p className="text-xs text-slate-400">
              Receita consolidada mês a mês baseada na data agendada de entrega
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total no período: </span>
            <span className="text-sm font-bold text-blue-600">
              {formatarMoeda(evolucaoMensal.reduce((s, m) => s + m.faturamento, 0))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-end pt-6 pb-2 min-h-[180px]">
          {evolucaoMensal.map((item) => {
            const altura = Math.max(4, (item.faturamento / maxMensal) * 100);
            return (
              <div key={item.mesNumero} className="flex flex-col items-center gap-2 group">
                <div className="relative w-full flex items-end justify-center h-32">
                  {/* Tooltip no hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-10 bg-slate-800 text-white text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none">
                    <p className="font-semibold">{item.rotulo}</p>
                    <p>{formatarMoeda(item.faturamento)}</p>
                    <p className="text-[10px] text-slate-300">{item.volumeContratos} contratos</p>
                  </div>
                  {/* Barra Vertical */}
                  <div
                    style={{ height: `${altura}%` }}
                    className={`w-full max-w-[28px] rounded-t transition-all ${
                      item.faturamento > 0
                        ? "bg-blue-600 group-hover:bg-blue-700"
                        : "bg-slate-100"
                    }`}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-600">
                  {item.rotulo}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {item.faturamento > 0 ? `${Math.round(item.faturamento / 1000)}k` : "-"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. Distribuição por Categoria e Perfil de Cliente */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Faturamento por Categoria */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Faturamento por Categoria de Item
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Participação de cada grupo de produtos na receita total
          </p>

          {faturamentoPorCategoria.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum dado com os filtros aplicados.</p>
          ) : (
            <div className="space-y-3">
              {faturamentoPorCategoria.map((cat, i) => {
                const percentual = totalCat > 0 ? (cat.faturamento / totalCat) * 100 : 0;
                const largura = (cat.faturamento / maxCat) * 100;
                const CORES = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#4b5563"];
                const cor = CORES[i % CORES.length];

                return (
                  <div key={cat.id || cat.categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{cat.categoria}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">({cat.quantidade} peças)</span>
                        <span className="font-semibold text-slate-900">
                          {formatarMoeda(cat.faturamento)}
                        </span>
                        <span className="w-10 text-right font-medium text-slate-500">
                          {percentual.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${largura}%`, backgroundColor: cor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Faturamento por Tipo de Cliente */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Receita por Perfil de Cliente
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Comparativo entre Pessoa Física, Cerimonialistas, Buffets e Empresas
          </p>

          {faturamentoPorTipoCliente.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum dado com os filtros aplicados.</p>
          ) : (
            <div className="space-y-3">
              {faturamentoPorTipoCliente.map((item, i) => {
                const largura = (item.faturamento / maxTipo) * 100;
                const CORES = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                const cor = CORES[i % CORES.length];

                return (
                  <div key={item.id || item.tipo} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">({item.contratos} contratos)</span>
                        <span className="font-semibold text-slate-900">
                          {formatarMoeda(item.faturamento)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${largura}%`, backgroundColor: cor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 3. Ranking dos Top 10 Itens Mais Rentáveis e Status das Locações */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Itens Mais Rentáveis */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Top Itens Mais Rentáveis
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Ranking dos produtos que mais geraram faturamento líquido
          </p>

          {topItens.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum item com os filtros selecionados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topItens.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-800"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-medium text-slate-900 truncate">{item.nome}</p>
                      <p className="text-[10px] text-slate-400">{item.categoria}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-slate-900">{formatarMoeda(item.faturamento)}</p>
                    <p className="text-[10px] text-slate-400">{item.quantidadeTotal} un. alugadas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Locações por Status */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-slate-800">
            Locações por Status do Contrato
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Distribuição dos pedidos nas etapas operacionais e comerciais
          </p>

          {locacoesPorStatus.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum contrato encontrado.</p>
          ) : (
            <div className="space-y-3">
              {locacoesPorStatus.map((st) => (
                <div key={st.id || st.status} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs">
                  <span className="font-medium text-slate-700">{st.status}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{st.quantidade} contratos</span>
                    <span className="font-semibold text-slate-900">{formatarMoeda(st.faturamento)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculos";
import type {
  PontoEvolucaoMensal,
  PontoDiario,
  FimDeSemanaCampeao,
  PontoCategoria,
  PontoTipoCliente,
  PontoStatus,
  PontoItemRanking,
  AbaBI,
} from "@/lib/bi/types";

interface BIGraficosProps {
  evolucaoMensal: PontoEvolucaoMensal[];
  evolucaoDiaria: PontoDiario[];
  fimDeSemanaCampeao: FimDeSemanaCampeao | null;
  faturamentoPorCategoria: PontoCategoria[];
  faturamentoPorTipoCliente: PontoTipoCliente[];
  locacoesPorStatus: PontoStatus[];
  topItens: PontoItemRanking[];
  abaAtiva?: AbaBI;
}

export function BIGraficos({
  evolucaoMensal,
  evolucaoDiaria,
  fimDeSemanaCampeao,
  faturamentoPorCategoria,
  faturamentoPorTipoCliente,
  locacoesPorStatus,
  topItens,
  abaAtiva = "financeiro",
}: BIGraficosProps) {
  const maxMensal = Math.max(1, ...evolucaoMensal.map((m) => m.faturamento));
  const maxDiario = Math.max(1, ...evolucaoDiaria.map((d) => d.faturamento));
  const totalCat = faturamentoPorCategoria.reduce((acc, c) => acc + c.faturamento, 0);
  const maxCat = Math.max(1, ...faturamentoPorCategoria.map((c) => c.faturamento));
  const maxTipo = Math.max(1, ...faturamentoPorTipoCliente.map((t) => t.faturamento));
  const maxStatusQtd = Math.max(1, ...locacoesPorStatus.map((s) => s.quantidade));

  // Paleta semântica colorida para os status dos contratos
  const CORES_STATUS: Record<string, string> = {
    Confirmada: "#2563eb", // Azul vibrante
    Entregue: "#059669", // Verde esmeralda
    Recolhida: "#64748b", // Slate neutro
    Atrasada: "#dc2626", // Vermelho alerta
    Orçamento: "#d97706", // Âmbar
    Cancelada: "#94a3b8", // Cinza claro
  };

  const ehFinanceiro = abaAtiva === "financeiro";
  const ehOperacional = abaAtiva === "operacional";

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. SEÇÃO FINANCEIRA: EVOLUÇÃO TEMPORAL, CATEGORIAS E PRODUTOS        */}
      {/* ==================================================================== */}
      {ehFinanceiro && (
        <>
          {/* Evolução Temporal Mês a Mês (Barras em Azul Vibrante) */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Evolução Temporal do Faturamento (Mensal)
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Receita consolidada mês a mês baseada na data agendada de entrega
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">Total no período: </span>
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
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-10 bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none">
                        <p className="font-semibold">{item.rotulo}</p>
                        <p>{formatarMoeda(item.faturamento)}</p>
                        <p className="text-[10px] text-slate-300">
                          {item.volumeContratos} contratos
                        </p>
                      </div>
                      <div
                        style={{ height: `${altura}%` }}
                        className={`w-full max-w-[28px] rounded-t transition-all ${
                          item.faturamento > 0
                            ? "bg-blue-600 group-hover:bg-blue-700"
                            : "bg-slate-100"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">
                      {item.rotulo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                      {item.faturamento > 0
                        ? `${Math.round(item.faturamento / 1000)}k`
                        : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Análise Diária & Fim de Semana Campeão (Índigo e Sky) */}
          {evolucaoDiaria.length > 0 && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Desempenho Diário & Finais de Semana Mais Rentáveis
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Distribuição da receita dia a dia com destaque para sextas, sábados e domingos
                  </p>
                </div>

                {fimDeSemanaCampeao && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs text-amber-950">
                    <span className="text-base">🏆</span>
                    <div>
                      <span className="font-bold">Fim de Semana Campeão: </span>
                      <span>{fimDeSemanaCampeao.rotulo}</span>
                      <span className="font-bold text-amber-950 ml-1">
                        ({formatarMoeda(fimDeSemanaCampeao.faturamento)})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de Barras Diárias Coloridas */}
              <div className="space-y-2 pt-2">
                <div className="flex items-end gap-1.5 overflow-x-auto pb-2 min-h-[160px]">
                  {evolucaoDiaria.map((d) => {
                    const altura = Math.max(6, (d.faturamento / maxDiario) * 100);
                    return (
                      <div
                        key={d.data}
                        className="flex flex-col items-center min-w-[36px] flex-1 group"
                      >
                        <div className="relative w-full flex items-end justify-center h-28">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-10 bg-slate-900 text-white text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none">
                            <p className="font-semibold">{d.data} ({d.diaSemana})</p>
                            <p>{formatarMoeda(d.faturamento)}</p>
                            <p className="text-[10px] text-slate-300">
                              {d.volumeContratos} contratos {d.ehFimDeSemana && "• Fim de Semana"}
                            </p>
                          </div>
                          <div
                            style={{ height: `${altura}%` }}
                            className={`w-full max-w-[24px] rounded-t transition-all ${
                              d.ehFimDeSemana
                                ? "bg-indigo-600 group-hover:bg-indigo-700"
                                : "bg-sky-500 group-hover:bg-sky-600"
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-1 text-[11px] font-bold ${
                            d.ehFimDeSemana ? "text-indigo-700 font-bold" : "text-slate-600"
                          }`}
                        >
                          {d.dia}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[36px]">
                          {d.diaSemana.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 pt-2 text-xs font-medium text-slate-700 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-indigo-600" />
                    <span className="font-semibold text-indigo-900">Final de Semana (Sexta a Domingo)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-sky-500" />
                    <span className="text-slate-600">Dias Úteis (Segunda a Quinta)</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Distribuição por Categoria e Perfil de Cliente */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Faturamento por Categoria */}
            <Card>
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                Faturamento por Categoria de Item
              </h3>
              <p className="mb-4 text-xs font-medium text-slate-500">
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
                          <span className="font-bold text-slate-900">{cat.categoria}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">({cat.quantidade} peças)</span>
                            <span className="font-bold text-slate-900">
                              {formatarMoeda(cat.faturamento)}
                            </span>
                            <span className="w-10 text-right font-semibold text-slate-600">
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

            {/* Faturamento por Perfil de Cliente */}
            <Card>
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                Receita por Perfil de Cliente
              </h3>
              <p className="mb-4 text-xs font-medium text-slate-500">
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
                          <span className="font-bold text-slate-900">{item.tipo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">({item.contratos} contratos)</span>
                            <span className="font-bold text-slate-900">
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

          {/* Top 10 Itens Mais Rentáveis */}
          <Card>
            <h3 className="mb-1 text-sm font-bold text-slate-900">
              Top Itens Mais Rentáveis
            </h3>
            <p className="mb-4 text-xs font-medium text-slate-500">
              Ranking dos produtos que mais geraram faturamento líquido
            </p>

            {topItens.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum item com os filtros selecionados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 divide-y md:divide-y-0 divide-slate-100">
                {topItens.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-xs border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : index === 1
                            ? "bg-slate-200 text-slate-800"
                            : index === 2
                            ? "bg-orange-100 text-orange-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">{item.nome}</p>
                        <p className="text-[10px] font-medium text-slate-500">{item.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">{formatarMoeda(item.faturamento)}</p>
                      <p className="text-[10px] font-medium text-slate-500">{item.quantidadeTotal} un. alugadas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ==================================================================== */}
      {/* 2. SEÇÃO OPERACIONAL: STATUS DAS LOCAÇÕES E GIRO DE ATIVOS           */}
      {/* ==================================================================== */}
      {ehOperacional && (
        <div className="space-y-6">
          {/* Gráfico Visual de Status das Locações (Cores Semânticas) */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Gráfico de Contratos por Status
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Proporção de contratos em cada etapa operacional (ativas, entregues, recolhidas e atrasadas)
                </p>
              </div>
              <div className="text-xs text-slate-700 font-bold">
                Total: {locacoesPorStatus.reduce((acc, s) => acc + s.quantidade, 0)} contratos
              </div>
            </div>

            {locacoesPorStatus.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum contrato encontrado para o período.</p>
            ) : (
              <div className="space-y-4 pt-1">
                {locacoesPorStatus.map((st) => {
                  const cor = CORES_STATUS[st.status] || "#64748b";
                  const largura = (st.quantidade / maxStatusQtd) * 100;

                  return (
                    <div key={st.id || st.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cor }}
                          />
                          <span className="font-bold text-slate-900">{st.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            {st.quantidade} {st.quantidade === 1 ? "locação" : "locações"}
                          </span>
                          <span className="text-slate-600 font-semibold">
                            ({st.percentual}%)
                          </span>
                          <span className="text-slate-900 font-bold w-24 text-right">
                            {formatarMoeda(st.faturamento)}
                          </span>
                        </div>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
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

          {/* Ranking de Giro de Utensílios */}
          <Card>
            <h3 className="mb-1 text-sm font-bold text-slate-900">
              Giro Operacional de Utensílios (Itens com Maior Saída Física)
            </h3>
            <p className="mb-4 text-xs font-medium text-slate-500">
              Classificação por quantidade física total movimentada no estoque
            </p>

            {topItens.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum dado com os filtros aplicados.</p>
            ) : (
              <div className="space-y-3">
                {[...topItens]
                  .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
                  .slice(0, 6)
                  .map((item, idx) => {
                    const maxQtd = Math.max(
                      1,
                      ...topItens.map((i) => i.quantidadeTotal),
                    );
                    const largura = (item.quantidadeTotal / maxQtd) * 100;

                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">#{idx + 1}</span>
                            <span className="font-bold text-slate-900">{item.nome}</span>
                            <span className="text-[10px] font-medium text-slate-500">({item.categoria})</span>
                          </div>
                          <span className="font-bold text-blue-700">
                            {item.quantidadeTotal} peças alugadas
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${largura}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

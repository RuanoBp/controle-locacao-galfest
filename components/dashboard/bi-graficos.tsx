import { Card } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculos";
import { BIGraficosTemporais } from "./bi-graficos-temporais";
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
          <BIGraficosTemporais
            evolucaoMensal={evolucaoMensal}
            evolucaoDiaria={evolucaoDiaria}
            fimDeSemanaCampeao={fimDeSemanaCampeao}
          />

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

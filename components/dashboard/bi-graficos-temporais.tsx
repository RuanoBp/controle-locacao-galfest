"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatarData, formatarMoeda } from "@/lib/calculos";
import type {
  FimDeSemanaCampeao,
  PontoDiario,
  PontoEvolucaoMensal,
  ResumoLocacaoDia,
} from "@/lib/bi/types";

interface BIGraficosTemporaisProps {
  evolucaoMensal: PontoEvolucaoMensal[];
  evolucaoDiaria: PontoDiario[];
  fimDeSemanaCampeao: FimDeSemanaCampeao | null;
}

type ModalAtivo =
  | { tipo: "mes"; ponto: PontoEvolucaoMensal }
  | { tipo: "dia"; ponto: PontoDiario }
  | { tipo: "fds"; fds: FimDeSemanaCampeao }
  | null;

const CORES_PERFIL = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function BIGraficosTemporais({
  evolucaoMensal,
  evolucaoDiaria,
  fimDeSemanaCampeao,
}: BIGraficosTemporaisProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalAtivo, setModalAtivo] = useState<ModalAtivo>(null);

  const maxMensal = Math.max(1, ...evolucaoMensal.map((m) => m.faturamento));
  const maxDiario = Math.max(1, ...evolucaoDiaria.map((d) => d.faturamento));

  // Fecha o popup ao pressionar Esc
  useEffect(() => {
    if (!modalAtivo) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModalAtivo(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalAtivo]);

  function filtrarPorMes(mesNumero: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(mesNumero));
    params.delete("de");
    params.delete("ate");
    params.delete("trimestre");
    setModalAtivo(null);
    router.push(`/?${params.toString()}`);
  }

  function filtrarPorIntervalo(de: string, ate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("de", de);
    params.set("ate", ate);
    params.delete("mes");
    params.delete("trimestre");
    setModalAtivo(null);
    router.push(`/?${params.toString()}`);
  }

  return (
    <>
      {/* Evolução Temporal Mês a Mês (Barras em Azul Vibrante) */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Evolução Temporal do Faturamento (Mensal)
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Receita consolidada mês a mês baseada na data agendada de entrega • Clique em um mês para ver detalhes
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
            const clicavel = Boolean(item.detalhe);

            return (
              <button
                key={item.mesNumero}
                type="button"
                disabled={!clicavel}
                onClick={() => clicavel && setModalAtivo({ tipo: "mes", ponto: item })}
                title={
                  clicavel
                    ? `Ver detalhes de ${item.detalhe?.nomeCompleto ?? item.rotulo}`
                    : "Sem faturamento neste mês"
                }
                className={`flex flex-col items-center gap-2 group bg-transparent border-0 p-0 ${
                  clicavel ? "cursor-pointer focus:outline-none" : "cursor-default"
                }`}
              >
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
                      clicavel
                        ? "bg-blue-600 group-hover:bg-blue-700 group-hover:ring-2 group-hover:ring-blue-300 group-focus-visible:ring-2 group-focus-visible:ring-blue-500"
                        : "bg-slate-100"
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700">
                  {item.rotulo}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                  {item.faturamento > 0
                    ? item.faturamento >= 1000
                      ? `${(item.faturamento / 1000).toFixed(1).replace(".0", "")}k`
                      : `R$ ${Math.round(item.faturamento)}`
                    : "-"}
                </span>
              </button>
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
                Distribuição da receita dia a dia com destaque para sextas, sábados e domingos • Clique em um dia para ver detalhes
              </p>
            </div>

            {fimDeSemanaCampeao && (
              <button
                type="button"
                onClick={() => setModalAtivo({ tipo: "fds", fds: fimDeSemanaCampeao })}
                title="Clique para ver o detalhamento completo do Fim de Semana Campeão"
                className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 text-xs text-amber-950 hover:bg-amber-100 hover:border-amber-400 transition-colors cursor-pointer text-left"
              >
                <span className="text-base">🏆</span>
                <div>
                  <span className="font-bold">Fim de Semana Campeão: </span>
                  <span>{fimDeSemanaCampeao.rotulo}</span>
                  <span className="font-bold text-amber-950 ml-1">
                    ({formatarMoeda(fimDeSemanaCampeao.faturamento)})
                  </span>
                  <span className="ml-1.5 text-[10px] font-semibold text-amber-800 underline">
                    Ver detalhes
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Gráfico de Barras Diárias Coloridas com Rótulos de Valor e Data DD/MM */}
          <div className="space-y-2 pt-2">
            <div className="flex items-end gap-2 overflow-x-auto pt-14 pb-2 min-h-[210px]">
              {evolucaoDiaria.map((d) => {
                const altura = Math.max(6, (d.faturamento / maxDiario) * 100);
                const diaMes = `${d.data.slice(8, 10)}/${d.data.slice(5, 7)}`;
                const dataCompleta = `${diaMes}/${d.data.slice(0, 4)}`;
                const valorCompacto =
                  d.faturamento >= 1000
                    ? `R$ ${(d.faturamento / 1000).toFixed(1).replace(".0", "")}k`
                    : `R$ ${Math.round(d.faturamento)}`;

                return (
                  <button
                    key={d.data}
                    type="button"
                    onClick={() => setModalAtivo({ tipo: "dia", ponto: d })}
                    title={`Ver locações e detalhes do dia ${dataCompleta}`}
                    className="flex flex-col items-center min-w-[52px] flex-1 group bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                  >
                    <div className="relative w-full flex flex-col items-center justify-end h-32">
                      {/* Tooltip completo no hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                        <p className="font-semibold">
                          {dataCompleta} ({d.diaSemana})
                        </p>
                        <p className="font-bold text-emerald-300">
                          {formatarMoeda(d.faturamento)}
                        </p>
                        <p className="text-[10px] text-slate-300">
                          {d.volumeContratos}{" "}
                          {d.volumeContratos === 1 ? "contrato" : "contratos"}
                          {d.ehFimDeSemana && " • Fim de Semana"}
                        </p>
                      </div>

                      {/* Rótulo de valor visível em cima da barra */}
                      <span className="mb-1 text-[10px] font-bold text-slate-700 tabular-nums whitespace-nowrap">
                        {valorCompacto}
                      </span>

                      {/* Barra vertical */}
                      <div
                        style={{ height: `${altura}%` }}
                        className={`w-full max-w-[26px] rounded-t transition-all ${
                          d.ehFimDeSemana
                            ? "bg-indigo-600 group-hover:bg-indigo-700 group-hover:ring-2 group-hover:ring-indigo-300"
                            : "bg-sky-500 group-hover:bg-sky-600 group-hover:ring-2 group-hover:ring-sky-300"
                        }`}
                      />
                    </div>

                    {/* Data DD/MM e dia da semana */}
                    <span
                      className={`mt-1.5 text-[11px] font-bold tabular-nums ${
                        d.ehFimDeSemana ? "text-indigo-700" : "text-slate-700"
                      }`}
                    >
                      {diaMes}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[46px]">
                      {d.diaSemana.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 pt-2 text-xs font-medium text-slate-700 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  Final de Semana (Sexta a Domingo)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-sky-500" />
                <span className="text-slate-600">Dias Úteis (Segunda a Quinta)</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* POPUPS DE DETALHAMENTO (MÊS / DIA / FIM DE SEMANA CAMPEÃO)           */}
      {/* ==================================================================== */}
      {modalAtivo && (
        <div
          onClick={() => setModalAtivo(null)}
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          >
            {modalAtivo.tipo === "mes" && modalAtivo.ponto.detalhe && (
              <ConteudoPopupMes
                ponto={modalAtivo.ponto}
                onFechar={() => setModalAtivo(null)}
                onFiltrarMes={() => filtrarPorMes(modalAtivo.ponto.mesNumero)}
              />
            )}

            {modalAtivo.tipo === "dia" && (
              <ConteudoPopupDia
                ponto={modalAtivo.ponto}
                onFechar={() => setModalAtivo(null)}
                onFiltrarDia={() => filtrarPorIntervalo(modalAtivo.ponto.data, modalAtivo.ponto.data)}
              />
            )}

            {modalAtivo.tipo === "fds" && (
              <ConteudoPopupFimDeSemana
                fds={modalAtivo.fds}
                onFechar={() => setModalAtivo(null)}
                onFiltrarFds={() =>
                  filtrarPorIntervalo(modalAtivo.fds.dataInicio, modalAtivo.fds.dataFim)
                }
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ========================================================================== */
/* SUBCOMPONENTES DE CONTEÚDO DOS POPUPS                                      */
/* ========================================================================== */

function ConteudoPopupMes({
  ponto,
  onFechar,
  onFiltrarMes,
}: {
  ponto: PontoEvolucaoMensal;
  onFechar: () => void;
  onFiltrarMes: () => void;
}) {
  const d = ponto.detalhe!;
  const maxPerfil = Math.max(1, ...d.perfisCliente.map((p) => p.faturamento));

  return (
    <>
      <CabecalhoModal
        titulo={`Raio-X de ${d.nomeCompleto}`}
        subtitulo={`Participação de ${d.participacaoPercentual.toFixed(1)}% no faturamento exibido no gráfico`}
        onFechar={onFechar}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 4 KPIs do Mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKpi
            rotulo="Faturamento do Mês"
            valor={formatarMoeda(ponto.faturamento)}
            destaque="text-emerald-700"
          />
          <MiniKpi
            rotulo="vs. Mês Anterior"
            valor={
              d.variacaoMesAnterior === null
                ? "Sem base"
                : `${d.variacaoMesAnterior >= 0 ? "+" : ""}${d.variacaoMesAnterior.toFixed(1)}%`
            }
            destaque={
              d.variacaoMesAnterior === null
                ? "text-slate-500"
                : d.variacaoMesAnterior >= 0
                ? "text-emerald-700"
                : "text-red-600"
            }
          />
          <MiniKpi
            rotulo="Contratos & Peças"
            valor={`${ponto.volumeContratos} (${d.totalPecas} pçs)`}
          />
          <MiniKpi rotulo="Ticket Médio" valor={formatarMoeda(d.ticketMedio)} />
        </div>

        {/* Destaques Temporais do Mês */}
        {(d.melhorDia || d.fimDeSemanaCampeao) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {d.melhorDia && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                <p className="text-[11px] font-bold uppercase text-blue-800">
                  Melhor Dia do Mês
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatarData(d.melhorDia.data)} ({d.melhorDia.diaSemana})
                </p>
                <p className="text-xs font-semibold text-blue-700">
                  {formatarMoeda(d.melhorDia.faturamento)}
                </p>
              </div>
            )}
            {d.fimDeSemanaCampeao && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                <p className="text-[11px] font-bold uppercase text-amber-900">
                  🏆 Fim de Semana Campeão do Mês
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {d.fimDeSemanaCampeao.rotulo} ({d.fimDeSemanaCampeao.contratos} contratos)
                </p>
                <p className="text-xs font-semibold text-amber-800">
                  {formatarMoeda(d.fimDeSemanaCampeao.faturamento)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Top Categorias e Perfil de Cliente do Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-3.5">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
              Top Categorias no Mês
            </h4>
            <div className="space-y-2">
              {d.topCategorias.map((cat) => (
                <div key={cat.id || cat.categoria} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    {cat.categoria}
                  </span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    {formatarMoeda(cat.faturamento)}{" "}
                    <span className="text-slate-500 font-normal">({cat.quantidade} pçs)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3.5">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
              Perfil de Cliente no Mês
            </h4>
            <div className="space-y-2">
              {d.perfisCliente.map((perfil, idx) => {
                const largura = (perfil.faturamento / maxPerfil) * 100;
                const cor = CORES_PERFIL[idx % CORES_PERFIL.length];
                return (
                  <div key={perfil.id || perfil.tipo} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{perfil.tipo}</span>
                      <span className="font-bold text-slate-900">
                        {formatarMoeda(perfil.faturamento)}{" "}
                        <span className="text-slate-500 font-normal">({perfil.contratos})</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${largura}%`, backgroundColor: cor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 5 Itens do Mês */}
        {d.topItens.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3.5">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
              Top 5 Itens Mais Rentáveis do Mês
            </h4>
            <div className="divide-y divide-slate-100">
              {d.topItens.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-900 truncate">{item.nome}</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      ({item.categoria})
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-bold text-slate-900">{formatarMoeda(item.faturamento)}</span>
                    <span className="ml-1.5 text-[10px] text-slate-500">
                      ({item.quantidadeTotal} un.)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status das Locações do Mês */}
        {d.statusResumo.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
              Status dos Contratos no Mês
            </h4>
            <div className="flex flex-wrap gap-2">
              {d.statusResumo.map((st) => (
                <div
                  key={st.id || st.status}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  <StatusBadge status={st.status} />
                  <span className="font-bold text-slate-900">{st.quantidade}</span>
                  <span className="text-slate-500">({st.percentual}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RodapeModal
        textoBotaoAcao={`Filtrar Dashboard em ${d.nomeCompleto}`}
        onAcao={onFiltrarMes}
        onFechar={onFechar}
      />
    </>
  );
}

function ConteudoPopupDia({
  ponto,
  onFechar,
  onFiltrarDia,
}: {
  ponto: PontoDiario;
  onFechar: () => void;
  onFiltrarDia: () => void;
}) {
  const { detalhe } = ponto;
  const dataFormatada = formatarData(ponto.data);

  return (
    <>
      <CabecalhoModal
        titulo={`Entregas de ${dataFormatada} (${ponto.diaSemana})`}
        subtitulo={`${detalhe.participacaoPercentual.toFixed(1)}% do faturamento diário exibido`}
        badge={
          ponto.ehFimDeSemana
            ? { texto: "Final de Semana", classe: "bg-indigo-100 text-indigo-800" }
            : { texto: "Dia Útil", classe: "bg-sky-100 text-sky-800" }
        }
        onFechar={onFechar}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 4 KPIs do Dia */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKpi
            rotulo="Faturamento do Dia"
            valor={formatarMoeda(ponto.faturamento)}
            destaque="text-emerald-700"
          />
          <MiniKpi rotulo="Contratos" valor={String(ponto.volumeContratos)} />
          <MiniKpi rotulo="Peças Entregues" valor={String(detalhe.totalPecas)} />
          <MiniKpi rotulo="Ticket Médio" valor={formatarMoeda(detalhe.ticketMedio)} />
        </div>

        {/* Contexto do Final de Semana */}
        {detalhe.fimDeSemanaContexto && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-950">
            <span className="font-bold">Fim de semana {detalhe.fimDeSemanaContexto.rotulo}: </span>
            este dia representou{" "}
            <span className="font-bold">{detalhe.fimDeSemanaContexto.percentualDoFds.toFixed(1)}%</span>{" "}
            de um total de{" "}
            <span className="font-bold">
              {formatarMoeda(detalhe.fimDeSemanaContexto.faturamentoFds)}
            </span>{" "}
            ({detalhe.fimDeSemanaContexto.contratosFds} contratos no fim de semana).
          </div>
        )}

        {/* Lista de Locações do Dia */}
        <ListaLocacoesPopup locacoes={detalhe.locacoes} titulo="Locações com Entrega neste Dia" />
      </div>

      <RodapeModal
        textoBotaoAcao={`Filtrar Dashboard em ${dataFormatada}`}
        onAcao={onFiltrarDia}
        onFechar={onFechar}
      />
    </>
  );
}

function ConteudoPopupFimDeSemana({
  fds,
  onFechar,
  onFiltrarFds,
}: {
  fds: FimDeSemanaCampeao;
  onFechar: () => void;
  onFiltrarFds: () => void;
}) {
  const ticketMedioFds = fds.contratos > 0 ? fds.faturamento / fds.contratos : 0;

  return (
    <>
      <CabecalhoModal
        titulo={`🏆 Fim de Semana Campeão: ${fds.rotulo}`}
        subtitulo={`De ${formatarData(fds.dataInicio)} até ${formatarData(fds.dataFim)} (Sexta a Domingo)`}
        badge={{ texto: "Maior Receita de FDS", classe: "bg-amber-100 text-amber-900" }}
        onFechar={onFechar}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Resumo do Fim de Semana */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniKpi
            rotulo="Faturamento do FDS"
            valor={formatarMoeda(fds.faturamento)}
            destaque="text-amber-800"
          />
          <MiniKpi rotulo="Total de Contratos" valor={String(fds.contratos)} />
          <MiniKpi rotulo="Ticket Médio" valor={formatarMoeda(ticketMedioFds)} />
        </div>

        {/* Quebra por dia do Fim de Semana */}
        {fds.dias.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
              Receita por Dia deste Fim de Semana
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {fds.dias.map((dia) => (
                <div
                  key={dia.data}
                  className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 flex items-center justify-between sm:block"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {formatarData(dia.data)} • {dia.diaSemana}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {dia.contratos} {dia.contratos === 1 ? "contrato" : "contratos"}
                    </p>
                  </div>
                  <p className="sm:mt-1 text-sm font-bold text-indigo-700">
                    {formatarMoeda(dia.faturamento)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todas as Locações do Fim de Semana */}
        <ListaLocacoesPopup
          locacoes={fds.locacoes}
          titulo="Todas as Locações deste Fim de Semana"
          mostrarDataEntrega
        />
      </div>

      <RodapeModal
        textoBotaoAcao="Filtrar Dashboard neste Fim de Semana"
        onAcao={onFiltrarFds}
        onFechar={onFechar}
      />
    </>
  );
}

/* ========================================================================== */
/* COMPONENTES AUXILIARES DE MODAL                                            */
/* ========================================================================== */

function CabecalhoModal({
  titulo,
  subtitulo,
  badge,
  onFechar,
}: {
  titulo: string;
  subtitulo: string;
  badge?: { texto: string; classe: string };
  onFechar: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
          {badge && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.classe}`}>
              {badge.texto}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium text-slate-600">{subtitulo}</p>
      </div>
      <button
        type="button"
        onClick={onFechar}
        aria-label="Fechar popup"
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

function RodapeModal({
  textoBotaoAcao,
  onAcao,
  onFechar,
}: {
  textoBotaoAcao: string;
  onAcao: () => void;
  onFechar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
      <button
        type="button"
        onClick={onAcao}
        className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {textoBotaoAcao}
      </button>
      <button
        type="button"
        onClick={onFechar}
        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        Fechar
      </button>
    </div>
  );
}

function MiniKpi({
  rotulo,
  valor,
  destaque = "text-slate-900",
}: {
  rotulo: string;
  valor: string;
  destaque?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-base font-bold ${destaque}`}>{valor}</p>
    </div>
  );
}

function ListaLocacoesPopup({
  locacoes,
  titulo,
  mostrarDataEntrega = false,
}: {
  locacoes: ResumoLocacaoDia[];
  titulo: string;
  mostrarDataEntrega?: boolean;
}) {
  return (
    <div>
      <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
        {titulo} ({locacoes.length})
      </h4>

      {locacoes.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhuma locação encontrada.</p>
      ) : (
        <div className="space-y-2.5">
          {locacoes.map((loc) => (
            <div
              key={loc.idLocacao}
              className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/locacoes/${loc.idLocacao}/editar`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-700 hover:underline"
                    >
                      {loc.clienteNome}
                    </Link>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {loc.tipoCliente}
                    </span>
                    <StatusBadge status={loc.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {mostrarDataEntrega && `Entrega: ${formatarData(loc.dataEntrega)} • `}
                    Recolhimento: {formatarData(loc.dataRecolhimento)}
                  </p>
                </div>

                <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                  {formatarMoeda(loc.valorTotal)}
                </span>
              </div>

              {loc.itensResumo.length > 0 && (
                <p className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Itens: </span>
                  {loc.itensResumo.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

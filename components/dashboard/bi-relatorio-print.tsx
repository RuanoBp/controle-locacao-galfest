"use client";

import { useState } from "react";
import { formatarData, formatarMoeda } from "@/lib/calculos";
import type {
  FiltrosBI,
  KpisBI,
  PontoCategoria,
  PontoDiario,
} from "@/lib/bi/types";

interface BIRelatorioPrintProps {
  kpis: KpisBI;
  evolucaoDiaria: PontoDiario[];
  faturamentoPorCategoria: PontoCategoria[];
  filtros: FiltrosBI;
}

const NOMES_MESES: Record<string, string> = {
  "1": "Janeiro",
  "2": "Fevereiro",
  "3": "Março",
  "4": "Abril",
  "5": "Maio",
  "6": "Junho",
  "7": "Julho",
  "8": "Agosto",
  "9": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

function descreverPeriodo(filtros: FiltrosBI): string {
  if (filtros.de || filtros.ate) {
    const de = filtros.de ? formatarData(filtros.de) : "Início";
    const ate = filtros.ate ? formatarData(filtros.ate) : "Hoje";
    return `${de} até ${ate}`;
  }
  const ano = filtros.ano || String(new Date().getFullYear());
  if (filtros.mes && NOMES_MESES[filtros.mes]) {
    return `${NOMES_MESES[filtros.mes]} de ${ano}`;
  }
  if (filtros.trimestre) {
    return `${filtros.trimestre}º Trimestre de ${ano}`;
  }
  return `Ano de ${ano}`;
}

export function BIRelatorioPrint({
  kpis,
  evolucaoDiaria,
  faturamentoPorCategoria,
  filtros,
}: BIRelatorioPrintProps) {
  const [aberto, setAberto] = useState(false);

  const periodoTexto = descreverPeriodo(filtros);
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function imprimir() {
    window.print();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="print:hidden inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
        title="Visualizar e imprimir relatório financeiro em PDF"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-red-600"
        >
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
            clipRule="evenodd"
          />
        </svg>
        <span>Relatório PDF / Imprimir</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-6 print:static print:bg-white print:p-0">
          <div className="bi-relatorio-print-area w-full max-w-4xl rounded-xl bg-white p-6 sm:p-8 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
            {/* Barra de ações (oculta na impressão/PDF) */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pré-visualização do Relatório Financeiro
                </h2>
                <p className="text-xs text-slate-500">
                  Clique em &quot;Imprimir / Salvar PDF&quot; e escolha &quot;Salvar como PDF&quot; no destino.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={imprimir}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Cabeçalho do Relatório Impresso */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Galfest — Relatório Financeiro de Locações
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Período analisado: {periodoTexto}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Emitido em: {dataGeracao}</p>
                <p>Sistema de Controle de Locação</p>
              </div>
            </div>

            {/* Resumo dos Indicadores */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Faturamento Total
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-700">
                  {formatarMoeda(kpis.faturamentoTotal)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Total de Contratos
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {kpis.totalContratos}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Peças Alugadas
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {new Intl.NumberFormat("pt-BR").format(kpis.totalPecasAlugadas)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Ticket Médio
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatarMoeda(kpis.ticketMedio)}
                </p>
              </div>
            </div>

            {/* Tabela Detalhada Dia por Dia */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold text-slate-900">
                Faturamento Detalhado — Dia por Dia
              </h3>
              {evolucaoDiaria.length === 0 ? (
                <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                  Nenhuma locação registrada para o período filtrado.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 text-left font-bold uppercase text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">Data</th>
                        <th className="px-3 py-2.5">Dia da Semana</th>
                        <th className="px-3 py-2.5 text-center">Contratos</th>
                        <th className="px-3 py-2.5 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {evolucaoDiaria.map((d) => (
                        <tr
                          key={d.data}
                          className={d.ehFimDeSemana ? "bg-slate-50/70" : ""}
                        >
                          <td className="px-3 py-2 font-semibold text-slate-900 tabular-nums">
                            {formatarData(d.data)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {d.diaSemana}
                            {d.ehFimDeSemana && (
                              <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                Fim de semana
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-slate-800 tabular-nums">
                            {d.volumeContratos}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                            {formatarMoeda(d.faturamento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="px-3 py-2.5">
                          TOTAL DO PERÍODO
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          {kpis.totalContratos}
                        </td>
                        <td className="px-3 py-2.5 text-right text-emerald-700 tabular-nums">
                          {formatarMoeda(kpis.faturamentoTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Resumo por Categoria */}
            {faturamentoPorCategoria.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Resumo por Categoria de Item
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-100 text-left font-bold uppercase text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2 text-center">Peças Alugadas</th>
                        <th className="px-3 py-2 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {faturamentoPorCategoria.map((cat) => (
                        <tr key={cat.id || cat.categoria}>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {cat.categoria}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700 tabular-nums">
                            {cat.quantidade}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                            {formatarMoeda(cat.faturamento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { DimCategoriaItem, DimTipoCliente, DimStatusLocacao } from "@/lib/bi/types";

interface BIFiltrosProps {
  anos: number[];
  categorias: DimCategoriaItem[];
  tiposCliente: DimTipoCliente[];
  statusList: DimStatusLocacao[];
}

export function BIFiltros({
  anos,
  categorias,
  tiposCliente,
  statusList,
}: BIFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const anoAtual = searchParams.get("ano") ?? String(new Date().getFullYear());
  const mesAtual = searchParams.get("mes") ?? "";
  const trimestreAtual = searchParams.get("trimestre") ?? "";
  const dataDeAtual = searchParams.get("de") ?? "";
  const dataAteAtual = searchParams.get("ate") ?? "";
  const categoriaAtual = searchParams.get("categoria_id") ?? "";
  const tipoClienteAtual = searchParams.get("tipo_cliente_id") ?? "";
  const statusAtual = searchParams.get("status_id") ?? "";

  const navegarComParams = useCallback(
    (params: URLSearchParams) => {
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router],
  );

  const aplicarFiltro = useCallback(
    (campo: string, valor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor) {
        params.set(campo, valor);
      } else {
        params.delete(campo);
      }

      // Se filtrou por período customizado (de/ate), limpa mês e trimestre
      if (campo === "de" || campo === "ate") {
        params.delete("mes");
        params.delete("trimestre");
      }

      // Se filtrou por mês ou trimestre, limpa de e ate
      if (campo === "mes" || campo === "trimestre") {
        params.delete("de");
        params.delete("ate");
      }

      // Conflito entre trimestre e mês
      if (campo === "trimestre" && valor) {
        params.delete("mes");
      }
      if (campo === "mes" && valor) {
        params.delete("trimestre");
      }

      navegarComParams(params);
    },
    [navegarComParams, searchParams],
  );

  const aplicarAtalhoPeriodo = useCallback(
    (tipo: "hoje" | "quinzena1" | "quinzena2" | "mes_completo") => {
      const params = new URLSearchParams(searchParams.toString());
      const agora = new Date();
      const ano = anoAtual || String(agora.getFullYear());
      const mesStr = (mesAtual || String(agora.getMonth() + 1)).padStart(2, "0");

      if (tipo === "hoje") {
        const hojeISO = agora.toISOString().slice(0, 10);
        params.set("de", hojeISO);
        params.set("ate", hojeISO);
        params.delete("mes");
        params.delete("trimestre");
      } else if (tipo === "quinzena1") {
        params.set("de", `${ano}-${mesStr}-01`);
        params.set("ate", `${ano}-${mesStr}-15`);
        params.delete("mes");
        params.delete("trimestre");
      } else if (tipo === "quinzena2") {
        const ultimoDia = new Date(Number(ano), Number(mesStr), 0).getDate();
        params.set("de", `${ano}-${mesStr}-16`);
        params.set("ate", `${ano}-${mesStr}-${ultimoDia}`);
        params.delete("mes");
        params.delete("trimestre");
      } else if (tipo === "mes_completo") {
        params.delete("de");
        params.delete("ate");
        params.set("ano", ano);
        params.set("mes", String(Number(mesStr)));
        params.delete("trimestre");
      }

      navegarComParams(params);
    },
    [anoAtual, mesAtual, navegarComParams, searchParams],
  );

  const limparFiltros = useCallback(() => {
    const params = new URLSearchParams();
    const tab = searchParams.get("tab");
    if (tab) params.set("tab", tab);
    navegarComParams(params);
  }, [navegarComParams, searchParams]);

  const temFiltroAtivo = Boolean(
    searchParams.get("mes") ||
      searchParams.get("trimestre") ||
      searchParams.get("de") ||
      searchParams.get("ate") ||
      searchParams.get("categoria_id") ||
      searchParams.get("tipo_cliente_id") ||
      searchParams.get("status_id") ||
      (searchParams.get("ano") && searchParams.get("ano") !== String(new Date().getFullYear())),
  );

  const MESES = [
    { num: "1", nome: "Janeiro" },
    { num: "2", nome: "Fevereiro" },
    { num: "3", nome: "Março" },
    { num: "4", nome: "Abril" },
    { num: "5", nome: "Maio" },
    { num: "6", nome: "Junho" },
    { num: "7", nome: "Julho" },
    { num: "8", nome: "Agosto" },
    { num: "9", nome: "Setembro" },
    { num: "10", nome: "Outubro" },
    { num: "11", nome: "Novembro" },
    { num: "12", nome: "Dezembro" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
      {/* Cabeçalho da Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-slate-900" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Filtros Multidimensionais do BI
          </h2>
          {isPending && (
            <span className="text-xs font-bold text-slate-900 animate-pulse">
              Atualizando dados...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Atalhos rápidos */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="font-medium">Atalhos:</span>
            <button
              type="button"
              onClick={() => aplicarAtalhoPeriodo("hoje")}
              className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 text-slate-800 cursor-pointer font-semibold transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalhoPeriodo("quinzena1")}
              className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 text-slate-800 cursor-pointer font-semibold transition-colors"
            >
              1ª Quinzena
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalhoPeriodo("quinzena2")}
              className="rounded bg-slate-100 px-2 py-0.5 hover:bg-slate-200 text-slate-800 cursor-pointer font-semibold transition-colors"
            >
              2ª Quinzena
            </button>
          </div>

          {temFiltroAtivo && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-xs font-bold text-slate-900 hover:text-red-700 hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid de Controles de Filtros */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {/* Filtro: Ano */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">Ano</label>
          <select
            value={anoAtual}
            onChange={(e) => aplicarFiltro("ano", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Mês */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">Mês</label>
          <select
            value={mesAtual}
            onChange={(e) => aplicarFiltro("mes", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todos os meses</option>
            {MESES.map((m) => (
              <option key={m.num} value={m.num}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Trimestre */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">Trimestre</label>
          <select
            value={trimestreAtual}
            onChange={(e) => aplicarFiltro("trimestre", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todos</option>
            <option value="1">1º Trimestre (Jan-Mar)</option>
            <option value="2">2º Trimestre (Abr-Jun)</option>
            <option value="3">3º Trimestre (Jul-Set)</option>
            <option value="4">4º Trimestre (Out-Dez)</option>
          </select>
        </div>

        {/* Filtro Data De (Data Inicial Livre) */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">
            De (Início)
          </label>
          <input
            type="date"
            value={dataDeAtual}
            onChange={(e) => aplicarFiltro("de", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Filtro Data Até (Data Final Livre) */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">
            Até (Fim)
          </label>
          <input
            type="date"
            value={dataAteAtual}
            onChange={(e) => aplicarFiltro("ate", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Filtro: Categoria */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">Categoria</label>
          <select
            value={categoriaAtual}
            onChange={(e) => aplicarFiltro("categoria_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria}>
                {cat.nome_categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Tipo de Cliente */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">
            Tipo de Cliente
          </label>
          <select
            value={tipoClienteAtual}
            onChange={(e) => aplicarFiltro("tipo_cliente_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todos</option>
            {tiposCliente.map((t) => (
              <option key={t.id_tipo_cliente} value={t.id_tipo_cliente}>
                {t.descricao}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Status */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-800">Status</label>
          <select
            value={statusAtual}
            onChange={(e) => aplicarFiltro("status_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            <option value="">Todos os status</option>
            {statusList.map((st) => (
              <option key={st.id_status} value={st.id_status}>
                {st.descricao_status}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

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
  const categoriaAtual = searchParams.get("categoria_id") ?? "";
  const tipoClienteAtual = searchParams.get("tipo_cliente_id") ?? "";
  const statusAtual = searchParams.get("status_id") ?? "";

  const aplicarFiltro = useCallback(
    (campo: string, valor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor) {
        params.set(campo, valor);
      } else {
        params.delete(campo);
      }

      // Se mudou o trimestre, limpa o mês para não colidir
      if (campo === "trimestre" && valor) {
        params.delete("mes");
      }
      // Se mudou o mês, limpa o trimestre
      if (campo === "mes" && valor) {
        params.delete("trimestre");
      }

      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const limparFiltros = useCallback(() => {
    startTransition(() => {
      router.push("/");
    });
  }, [router]);

  const temFiltroAtivo = Boolean(
    searchParams.get("mes") ||
    searchParams.get("trimestre") ||
    searchParams.get("categoria_id") ||
    searchParams.get("tipo_cliente_id") ||
    searchParams.get("status_id") ||
    (searchParams.get("ano") && searchParams.get("ano") !== String(new Date().getFullYear()))
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Filtros Multidimensionais do BI
          </h2>
          {isPending && (
            <span className="text-xs text-blue-600 animate-pulse">Atualizando dados...</span>
          )}
        </div>
        {temFiltroAtivo && (
          <button
            type="button"
            onClick={limparFiltros}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Filtro: Ano */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Ano</label>
          <select
            value={anoAtual}
            onChange={(e) => aplicarFiltro("ano", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Trimestre */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Trimestre</label>
          <select
            value={trimestreAtual}
            onChange={(e) => aplicarFiltro("trimestre", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="1">1º Trimestre (Jan-Mar)</option>
            <option value="2">2º Trimestre (Abr-Jun)</option>
            <option value="3">3º Trimestre (Jul-Set)</option>
            <option value="4">4º Trimestre (Out-Dez)</option>
          </select>
        </div>

        {/* Filtro: Mês */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Mês</label>
          <select
            value={mesAtual}
            onChange={(e) => aplicarFiltro("mes", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os meses</option>
            {MESES.map((m) => (
              <option key={m.num} value={m.num}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Categoria */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Categoria</label>
          <select
            value={categoriaAtual}
            onChange={(e) => aplicarFiltro("categoria_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de Cliente</label>
          <select
            value={tipoClienteAtual}
            onChange={(e) => aplicarFiltro("tipo_cliente_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={statusAtual}
            onChange={(e) => aplicarFiltro("status_id", e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

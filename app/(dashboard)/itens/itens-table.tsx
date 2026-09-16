"use client";

import { useMemo, useState, useTransition } from "react";
import { LinkButton, Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/spinner";
import { formatarMoeda } from "@/lib/calculos";
import type { ItemComEstoque } from "@/lib/types";
import { deleteItensEmMassa } from "./actions";

export function ItensTable({ itens }: { itens: ItemComEstoque[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const todosSelecionados = itens.length > 0 && selecionados.size === itens.length;

  const idsSelecionadosOrdenados = useMemo(
    () => Array.from(selecionados),
    [selecionados],
  );

  function alternarTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(itens.map((i) => i.id)));
  }

  function alternarUm(id: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function excluir(ids: number[], mensagemConfirmacao: string) {
    if (!confirm(mensagemConfirmacao)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await deleteItensEmMassa(ids);
      if (resultado.erro) {
        setErro(resultado.erro);
      } else {
        setSelecionados((atual) => {
          const novo = new Set(atual);
          ids.forEach((id) => novo.delete(id));
          return novo;
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      {selecionados.size > 0 && (
        <div className="flex items-center justify-between rounded-md bg-slate-100 px-4 py-2">
          <span className="text-sm text-slate-700">
            {selecionados.size} item(ns) selecionado(s)
          </span>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              excluir(
                idsSelecionadosOrdenados,
                `Excluir ${selecionados.size} item(ns) selecionado(s)?`,
              )
            }
          >
            Excluir selecionados
          </Button>
        </div>
      )}

      {erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <LoadingOverlay show={pending} label="Excluindo..." />
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={alternarTodos}
                  aria-label="Selecionar todos os itens"
                />
              </th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Estoque Total</th>
              <th className="px-4 py-3">Disponível Hoje</th>
              <th className="px-4 py-3">Preço Diária</th>
              <th className="px-4 py-3">Custo Aquisição</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itens.map((item) => (
              <tr key={item.id} className={selecionados.has(item.id) ? "bg-slate-50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(item.id)}
                    onChange={() => alternarUm(item.id)}
                    aria-label={`Selecionar ${item.nome}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                <td className="px-4 py-3 text-slate-600">{item.categoria}</td>
                <td className="px-4 py-3 text-slate-600">{item.estoque_total}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      item.disponivel_hoje <= 0
                        ? "font-semibold text-red-600"
                        : item.disponivel_hoje <= item.estoque_total * 0.2
                          ? "font-semibold text-amber-600"
                          : "text-emerald-700"
                    }
                  >
                    {item.disponivel_hoje}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatarMoeda(item.preco_diaria)}</td>
                <td className="px-4 py-3 text-slate-600">{formatarMoeda(item.custo_aquisicao)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <LinkButton
                    href={`/itens/${item.id}/editar`}
                    variant="secondary"
                    className="mr-2"
                  >
                    Editar
                  </LinkButton>
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() => excluir([item.id], `Excluir o item "${item.nome}"?`)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum item cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

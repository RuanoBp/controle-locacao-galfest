"use client";

import { useMemo, useState, useTransition } from "react";
import { LinkButton, Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/spinner";
import type { Cliente } from "@/lib/types";
import { deleteClientesEmMassa } from "./actions";

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const todosSelecionados = clientes.length > 0 && selecionados.size === clientes.length;

  const idsSelecionadosOrdenados = useMemo(
    () => Array.from(selecionados),
    [selecionados],
  );

  function alternarTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(clientes.map((c) => c.id)));
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
      const resultado = await deleteClientesEmMassa(ids);
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
            {selecionados.size} cliente(s) selecionado(s)
          </span>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              excluir(
                idsSelecionadosOrdenados,
                `Excluir ${selecionados.size} cliente(s) selecionado(s)?`,
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
                  aria-label="Selecionar todos os clientes"
                />
              </th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cidade/Bairro</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className={selecionados.has(cliente.id) ? "bg-slate-50" : undefined}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(cliente.id)}
                    onChange={() => alternarUm(cliente.id)}
                    aria-label={`Selecionar ${cliente.nome}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{cliente.nome}</td>
                <td className="px-4 py-3 text-slate-600">{cliente.tipo}</td>
                <td className="px-4 py-3 text-slate-600">{cliente.cidade_bairro || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{cliente.telefone || "-"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <LinkButton
                    href={`/clientes/${cliente.id}/editar`}
                    variant="secondary"
                    className="mr-2"
                  >
                    Editar
                  </LinkButton>
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() => excluir([cliente.id], `Excluir o cliente "${cliente.nome}"?`)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

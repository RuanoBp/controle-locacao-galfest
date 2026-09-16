import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { DeleteForm } from "@/components/ui/delete-form";
import { StatusBadge } from "@/components/ui/badge";
import { Select, Input } from "@/components/ui/field";
import { formatarMoeda, formatarData, estaAtrasada, valorTotalLocacao } from "@/lib/calculos";
import { STATUS_LOCACAO, type Cliente } from "@/lib/types";
import { deleteLocacao } from "./actions";

export const metadata = { title: "Locações" };

interface LinhaLocacao {
  id: number;
  data: string;
  data_entrega: string;
  data_recolher: string;
  status: string;
  valor_frete: number;
  cliente: { id: number; nome: string } | null;
  itens_alugados: { quantidade: number; preco_diaria: number }[];
}

export default async function LocacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    cliente_id?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  await requireUser();
  const filtros = await searchParams;
  const supabase = await createClient();

  const { data: clientes } = (await supabase
    .from("clientes")
    .select("id, nome")
    .order("nome")) as { data: Cliente[] | null };

  let query = supabase
    .from("locacoes")
    .select(
      "id, data, data_entrega, data_recolher, status, valor_frete, cliente:clientes(id, nome), itens_alugados(quantidade, preco_diaria)",
    )
    .order("data_entrega", { ascending: false });

  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.cliente_id) query = query.eq("cliente_id", filtros.cliente_id);
  if (filtros.de) query = query.gte("data_entrega", filtros.de);
  if (filtros.ate) query = query.lte("data_entrega", filtros.ate);

  const { data: locacoes, error } = (await query) as unknown as {
    data: LinhaLocacao[] | null;
    error: unknown;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Locações</h1>
        <LinkButton href="/locacoes/novo">Nova locação</LinkButton>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Status
          </label>
          <Select name="status" defaultValue={filtros.status ?? ""} className="w-44">
            <option value="">Todos</option>
            {STATUS_LOCACAO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Cliente
          </label>
          <Select
            name="cliente_id"
            defaultValue={filtros.cliente_id ?? ""}
            className="w-52"
          >
            <option value="">Todos</option>
            {clientes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Entrega de
          </label>
          <Input type="date" name="de" defaultValue={filtros.de ?? ""} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Entrega até
          </label>
          <Input type="date" name="ate" defaultValue={filtros.ate ?? ""} className="w-40" />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Filtrar
        </button>
        <a href="/locacoes" className="text-sm text-slate-500 hover:underline">
          Limpar filtros
        </a>
      </form>

      {error ? (
        <p className="text-sm text-red-600">Erro ao carregar locações.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Recolher</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locacoes?.map((locacao) => {
                const valorTotal = valorTotalLocacao({
                  itens: locacao.itens_alugados ?? [],
                  data_entrega: locacao.data_entrega,
                  data_recolher: locacao.data_recolher,
                  valor_frete: locacao.valor_frete,
                });
                const atrasada = estaAtrasada(locacao.status, locacao.data_recolher);

                return (
                  <tr key={locacao.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {locacao.cliente?.nome ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarData(locacao.data_entrega)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarData(locacao.data_recolher)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={locacao.status} />
                        {atrasada && (
                          <span className="text-xs font-medium text-red-600">
                            Atrasada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatarMoeda(valorTotal ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <LinkButton
                        href={`/locacoes/${locacao.id}/editar`}
                        variant="secondary"
                        className="mr-2"
                      >
                        Editar
                      </LinkButton>
                      <DeleteForm
                        action={deleteLocacao}
                        id={locacao.id}
                        confirmMessage="Excluir esta locação?"
                      />
                    </td>
                  </tr>
                );
              })}
              {locacoes?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Nenhuma locação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

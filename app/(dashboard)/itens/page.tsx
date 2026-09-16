import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { DeleteForm } from "@/components/ui/delete-form";
import { formatarMoeda } from "@/lib/calculos";
import type { ItemComEstoque } from "@/lib/types";
import { deleteItem } from "./actions";

export const metadata = { title: "Itens" };

export default async function ItensPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: itens, error } = await supabase
    .from("v_itens_estoque")
    .select("*")
    .order("nome") as { data: ItemComEstoque[] | null; error: unknown };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Itens</h1>
          <p className="text-sm text-slate-500">
            Estoque disponível considera as locações ativas de hoje.
          </p>
        </div>
        <LinkButton href="/itens/novo">Novo item</LinkButton>
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          Erro ao carregar itens. Verifique a conexão com o Supabase.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
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
              {itens?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.nome}
                  </td>
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
                  <td className="px-4 py-3 text-slate-600">
                    {formatarMoeda(item.preco_diaria)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatarMoeda(item.custo_aquisicao)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <LinkButton
                      href={`/itens/${item.id}/editar`}
                      variant="secondary"
                      className="mr-2"
                    >
                      Editar
                    </LinkButton>
                    <DeleteForm
                      action={deleteItem}
                      id={item.id}
                      confirmMessage={`Excluir o item "${item.nome}"?`}
                    />
                  </td>
                </tr>
              ))}
              {itens?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Nenhum item cadastrado ainda.
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

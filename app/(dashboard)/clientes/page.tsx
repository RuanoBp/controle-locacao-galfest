import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { DeleteForm } from "@/components/ui/delete-form";
import type { Cliente } from "@/lib/types";
import { deleteCliente } from "./actions";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome") as { data: Cliente[] | null; error: unknown };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <LinkButton href="/clientes/novo">Novo cliente</LinkButton>
      </div>

      {error ? (
        <p className="text-sm text-red-600">Erro ao carregar clientes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cidade/Bairro</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes?.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cliente.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cliente.tipo}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {cliente.cidade_bairro || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {cliente.telefone || "-"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <LinkButton
                      href={`/clientes/${cliente.id}/editar`}
                      variant="secondary"
                      className="mr-2"
                    >
                      Editar
                    </LinkButton>
                    <DeleteForm
                      action={deleteCliente}
                      id={cliente.id}
                      confirmMessage={`Excluir o cliente "${cliente.nome}"?`}
                    />
                  </td>
                </tr>
              ))}
              {clientes?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nenhum cliente cadastrado ainda.
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

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocacaoForm } from "../locacao-form";
import { createLocacao } from "../actions";
import type { Cliente, Item } from "@/lib/types";

export const metadata = { title: "Nova locação" };

export default async function NovaLocacaoPage() {
  await requireUser();
  const supabase = await createClient();

  const [{ data: clientes }, { data: itens }] = await Promise.all([
    supabase.from("clientes").select("*").order("nome") as unknown as Promise<{
      data: Cliente[] | null;
    }>,
    supabase.from("itens").select("*").order("nome") as unknown as Promise<{
      data: Item[] | null;
    }>,
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Nova locação</h1>
      {clientes?.length === 0 ? (
        <p className="text-sm text-amber-700">
          Cadastre ao menos um cliente antes de criar uma locação.
        </p>
      ) : itens?.length === 0 ? (
        <p className="text-sm text-amber-700">
          Cadastre ao menos um item antes de criar uma locação.
        </p>
      ) : (
        <LocacaoForm
          clientes={clientes ?? []}
          itens={itens ?? []}
          action={createLocacao}
        />
      )}
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import type { Cliente } from "@/lib/types";
import { ClientesTable } from "./clientes-table";

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
        <ClientesTable clientes={clientes ?? []} />
      )}
    </div>
  );
}

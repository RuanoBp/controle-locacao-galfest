import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "../../cliente-form";
import { updateCliente } from "../../actions";
import type { Cliente } from "@/lib/types";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Cliente>();

  if (!cliente) {
    notFound();
  }

  const updateClienteWithId = updateCliente.bind(null, cliente.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Editar cliente: {cliente.nome}
      </h1>
      <ClienteForm cliente={cliente} action={updateClienteWithId} />
    </div>
  );
}

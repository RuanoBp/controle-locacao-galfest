import { requireUser } from "@/lib/auth";
import { ClienteForm } from "../cliente-form";
import { createCliente } from "../actions";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Novo cliente</h1>
      <ClienteForm action={createCliente} />
    </div>
  );
}

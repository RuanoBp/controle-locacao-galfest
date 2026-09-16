import { requireUser } from "@/lib/auth";
import { ImportTabs } from "@/components/importar/tabs";
import { ImportForm } from "@/components/importar/import-form";
import { importarClientes } from "./actions";

export const metadata = { title: "Importar clientes" };

export default async function ImportarClientesPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Importar planilha</h1>
      <ImportTabs />
      <ImportForm action={importarClientes} modeloHref="/modelos/modelo-clientes.xlsx" />
    </div>
  );
}

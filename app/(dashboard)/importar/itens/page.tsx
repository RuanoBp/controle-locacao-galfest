import { requireUser } from "@/lib/auth";
import { ImportTabs } from "@/components/importar/tabs";
import { ImportForm } from "@/components/importar/import-form";
import { importarItens } from "./actions";

export const metadata = { title: "Importar itens" };

export default async function ImportarItensPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Importar planilha</h1>
      <ImportTabs />
      <ImportForm action={importarItens} modeloHref="/modelos/modelo-itens.xlsx" />
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { ImportTabs } from "@/components/importar/tabs";
import { ImportForm } from "@/components/importar/import-form";
import { importarLocacoes } from "./actions";

export const metadata = { title: "Importar locações" };

export default async function ImportarLocacoesPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Importar planilha</h1>
      <ImportTabs />
      <p className="text-sm text-slate-500">
        A coluna <strong>Itens</strong> deve listar os itens da locação no
        formato <code className="rounded bg-slate-100 px-1">Nome:Quantidade</code>,
        separados por ponto e vírgula — ex: <code className="rounded bg-slate-100 px-1">Mesa redonda:10;Cadeira tiffany:50</code>.
        Clientes e itens citados precisam já estar cadastrados.
      </p>
      <ImportForm action={importarLocacoes} modeloHref="/modelos/modelo-locacoes.xlsx" />
    </div>
  );
}

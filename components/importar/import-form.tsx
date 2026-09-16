"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ImportResultado } from "@/lib/import/types";

type ImportAction = (
  prevState: ImportResultado | null,
  formData: FormData,
) => Promise<ImportResultado>;

export function ImportForm({
  action,
  modeloHref,
}: {
  action: ImportAction;
  modeloHref: string;
}) {
  const [resultado, formAction, pending] = useActionState<
    ImportResultado | null,
    FormData
  >(action, null);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          1. Baixe o modelo de planilha, preencha os dados e depois envie o
          arquivo preenchido (.xlsx ou .csv).
        </p>
        <a
          href={modeloHref}
          download
          className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Baixar modelo de planilha
        </a>
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="arquivo"
          accept=".xlsx,.csv"
          required
          className="text-sm"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Importando..." : "Importar"}
        </Button>
      </form>

      {resultado && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            {resultado.totalLinhas} linha(s) lida(s) · {" "}
            <span className="font-medium text-emerald-700">
              {resultado.sucesso} importada(s) com sucesso
            </span>
            {resultado.erros.length > 0 && (
              <>
                {" · "}
                <span className="font-medium text-red-600">
                  {resultado.erros.length} com erro
                </span>
              </>
            )}
          </p>

          {resultado.erros.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-md border border-red-100">
              <table className="min-w-full divide-y divide-red-100 text-sm">
                <thead className="bg-red-50 text-left text-xs font-medium uppercase text-red-700">
                  <tr>
                    <th className="px-3 py-2">Linha</th>
                    <th className="px-3 py-2">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {resultado.erros.map((erro, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-600">
                        {erro.linha > 0 ? erro.linha : "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{erro.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

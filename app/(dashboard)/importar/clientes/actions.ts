"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lerPlanilha, mapearLinha } from "@/lib/import/parse";
import { clienteImportSchema } from "@/lib/validators/cliente";
import type { ImportResultado } from "@/lib/import/types";

const MAPA_COLUNAS = {
  nome: ["Nome Cliente", "Nome"],
  tipo: ["Tipo Cliente", "Tipo"],
  cidade_bairro: ["Cidade ou Bairro", "Cidade/Bairro", "Cidade"],
  telefone: ["Telefone"],
} as const;

export async function importarClientes(
  _prevState: ImportResultado | null,
  formData: FormData,
): Promise<ImportResultado> {
  await requireUser();

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) {
    return {
      totalLinhas: 0,
      sucesso: 0,
      erros: [{ linha: 0, mensagem: "Selecione um arquivo .xlsx ou .csv." }],
    };
  }

  const linhas = await lerPlanilha(arquivo);
  const erros: ImportResultado["erros"] = [];
  const validos: {
    nome: string;
    tipo: string;
    cidade_bairro: string;
    telefone: string;
  }[] = [];

  linhas.forEach((linha, index) => {
    const mapeada = mapearLinha(linha, MAPA_COLUNAS);
    const parsed = clienteImportSchema.safeParse(mapeada);
    if (!parsed.success) {
      erros.push({
        linha: index + 2,
        mensagem: parsed.error.issues.map((i) => i.message).join("; "),
      });
    } else {
      validos.push(parsed.data);
    }
  });

  let sucesso = 0;
  if (validos.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("clientes").insert(validos);
    if (error) {
      erros.push({ linha: 0, mensagem: `Erro ao gravar no banco: ${error.message}` });
    } else {
      sucesso = validos.length;
    }
  }

  revalidatePath("/clientes");
  return { totalLinhas: linhas.length, sucesso, erros };
}

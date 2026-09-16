"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lerPlanilha, mapearLinha } from "@/lib/import/parse";
import { itemImportSchema } from "@/lib/validators/item";
import type { ImportResultado } from "@/lib/import/types";

const MAPA_COLUNAS = {
  nome: ["Nome"],
  categoria: ["Categoria"],
  estoque_total: ["Estoque Total"],
  preco_diaria: ["Preço Diária", "Preco Diaria"],
  custo_aquisicao: ["Custo de Aquisição", "Custo de Aquisicao"],
} as const;

export async function importarItens(
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
    categoria: string;
    estoque_total: number;
    preco_diaria: number;
    custo_aquisicao: number;
  }[] = [];

  linhas.forEach((linha, index) => {
    const mapeada = mapearLinha(linha, MAPA_COLUNAS);
    const parsed = itemImportSchema.safeParse(mapeada);
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
    const { error } = await supabase.from("itens").insert(validos);
    if (error) {
      erros.push({ linha: 0, mensagem: `Erro ao gravar no banco: ${error.message}` });
    } else {
      sucesso = validos.length;
    }
  }

  revalidatePath("/itens");
  return { totalLinhas: linhas.length, sucesso, erros };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lerPlanilha, mapearLinha, normalizarData } from "@/lib/import/parse";
import { locacaoImportSchema } from "@/lib/validators/locacao";
import { STATUS_LOCACAO } from "@/lib/types";
import type { ImportResultado } from "@/lib/import/types";

const MAPA_COLUNAS = {
  cliente: ["Cliente", "Nome Cliente"],
  data: ["Data"],
  data_entrega: ["Data para Entrega", "Data Entrega"],
  data_recolher: ["Data para Recolher", "Data Recolher"],
  status: ["Status"],
  valor_frete: ["Valor Frete"],
  itens: ["Itens", "Itens Alugados"],
} as const;

function parsePares(itensTexto: string) {
  return itensTexto
    .split(";")
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => {
      const [nome, quantidadeTexto] = par.split(":").map((v) => v.trim());
      return { nome, quantidade: Number(quantidadeTexto) };
    });
}

export async function importarLocacoes(
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

  const supabase = await createClient();
  const linhas = await lerPlanilha(arquivo);
  const erros: ImportResultado["erros"] = [];

  const [{ data: clientes }, { data: itens }] = await Promise.all([
    supabase.from("clientes").select("id, nome"),
    supabase.from("itens").select("id, nome, preco_diaria, estoque_total"),
  ]);

  const clientePorNome = new Map(
    (clientes ?? []).map((c) => [c.nome.trim().toLowerCase(), c.id]),
  );
  const itemPorNome = new Map(
    (itens ?? []).map((i) => [
      i.nome.trim().toLowerCase(),
      { id: i.id, preco_diaria: i.preco_diaria, estoque_total: i.estoque_total },
    ]),
  );

  let sucesso = 0;

  for (let index = 0; index < linhas.length; index++) {
    const numeroLinha = index + 2;
    const mapeada = mapearLinha(linhas[index], MAPA_COLUNAS);
    const parsed = locacaoImportSchema.safeParse(mapeada);

    if (!parsed.success) {
      erros.push({
        linha: numeroLinha,
        mensagem: parsed.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    const bruto = parsed.data;
    const clienteId = clientePorNome.get(bruto.cliente.trim().toLowerCase());
    if (!clienteId) {
      erros.push({
        linha: numeroLinha,
        mensagem: `Cliente "${bruto.cliente}" não encontrado. Cadastre-o antes de importar.`,
      });
      continue;
    }

    const data = normalizarData(bruto.data);
    const dataEntrega = normalizarData(bruto.data_entrega);
    const dataRecolher = normalizarData(bruto.data_recolher);
    if (!data || !dataEntrega || !dataRecolher) {
      erros.push({
        linha: numeroLinha,
        mensagem: "Datas devem estar no formato AAAA-MM-DD ou DD/MM/AAAA.",
      });
      continue;
    }
    if (dataRecolher < dataEntrega) {
      erros.push({
        linha: numeroLinha,
        mensagem: "Data para Recolher não pode ser anterior à Data para Entrega.",
      });
      continue;
    }

    const status = STATUS_LOCACAO.find(
      (s) => s.toLowerCase() === bruto.status.trim().toLowerCase(),
    );
    if (!status) {
      erros.push({
        linha: numeroLinha,
        mensagem: `Status "${bruto.status}" inválido. Use um de: ${STATUS_LOCACAO.join(", ")}.`,
      });
      continue;
    }

    const pares = parsePares(bruto.itens);
    if (pares.length === 0) {
      erros.push({
        linha: numeroLinha,
        mensagem: 'Coluna "Itens" deve seguir o formato Nome:Quantidade;Nome2:Quantidade2.',
      });
      continue;
    }

    const itensResolvidos: { item_id: number; quantidade: number; preco_diaria: number }[] = [];
    let itemInvalido = false;
    for (const par of pares) {
      const item = itemPorNome.get(par.nome?.toLowerCase() ?? "");
      if (!item || !Number.isFinite(par.quantidade) || par.quantidade <= 0) {
        erros.push({
          linha: numeroLinha,
          mensagem: `Item "${par.nome}" inválido ou não cadastrado.`,
        });
        itemInvalido = true;
        break;
      }

      const { data: comprometido } = await supabase.rpc("estoque_comprometido", {
        p_item_id: item.id,
        p_data_entrega: dataEntrega,
        p_data_recolher: dataRecolher,
      });
      const disponivel = item.estoque_total - Number(comprometido ?? 0);
      if (par.quantidade > disponivel) {
        erros.push({
          linha: numeroLinha,
          mensagem: `Item "${par.nome}": pedido ${par.quantidade}, disponível ${Math.max(0, disponivel)} no período.`,
        });
        itemInvalido = true;
        break;
      }

      itensResolvidos.push({
        item_id: item.id,
        quantidade: par.quantidade,
        preco_diaria: item.preco_diaria,
      });
    }
    if (itemInvalido) continue;

    const { data: novaLocacao, error: locacaoError } = await supabase
      .from("locacoes")
      .insert({
        cliente_id: clienteId,
        data,
        data_entrega: dataEntrega,
        data_recolher: dataRecolher,
        status,
        valor_frete: bruto.valor_frete,
      })
      .select("id")
      .single();

    if (locacaoError || !novaLocacao) {
      erros.push({
        linha: numeroLinha,
        mensagem: `Erro ao gravar locação: ${locacaoError?.message}`,
      });
      continue;
    }

    const { error: itensError } = await supabase.from("itens_alugados").insert(
      itensResolvidos.map((i) => ({ ...i, locacao_id: novaLocacao.id })),
    );

    if (itensError) {
      erros.push({
        linha: numeroLinha,
        mensagem: `Locação criada, mas houve erro ao gravar os itens: ${itensError.message}`,
      });
      continue;
    }

    sucesso += 1;
  }

  revalidatePath("/locacoes");
  revalidatePath("/itens");
  revalidatePath("/");
  return { totalLinhas: linhas.length, sucesso, erros };
}

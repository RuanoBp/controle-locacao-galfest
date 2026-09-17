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

function periodosSeSobrepoem(
  aEntrega: string,
  aRecolher: string,
  bEntrega: string,
  bRecolher: string,
) {
  return aEntrega <= bRecolher && bEntrega <= aRecolher;
}

interface LinhaValidada {
  numeroLinha: number;
  cliente_id: number;
  data: string;
  data_entrega: string;
  data_recolher: string;
  status: string;
  valor_frete: number;
  itensResolvidos: { item_id: number; nome: string; quantidade: number; preco_diaria: number }[];
}

interface Compromisso {
  item_id: number;
  quantidade: number;
  data_entrega: string;
  data_recolher: string;
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

  // Uma única ida ao banco para trazer todos os clientes e itens cadastrados.
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
      { id: i.id, nome: i.nome, preco_diaria: i.preco_diaria, estoque_total: i.estoque_total },
    ]),
  );
  const estoqueTotalPorId = new Map((itens ?? []).map((i) => [i.id, i.estoque_total]));

  // --- Passo 1: validar todas as linhas (sem ida nenhuma ao banco aqui) ---
  const linhasValidas: LinhaValidada[] = [];

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

    const itensResolvidos: LinhaValidada["itensResolvidos"] = [];
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
      itensResolvidos.push({
        item_id: item.id,
        nome: item.nome,
        quantidade: par.quantidade,
        preco_diaria: item.preco_diaria,
      });
    }
    if (itemInvalido) continue;

    linhasValidas.push({
      numeroLinha,
      cliente_id: clienteId,
      data,
      data_entrega: dataEntrega,
      data_recolher: dataRecolher,
      status,
      valor_frete: bruto.valor_frete,
      itensResolvidos,
    });
  }

  // --- Passo 2: checar disponibilidade em memória (uma única ida ao banco) ---
  const itemIdsEnvolvidos = [
    ...new Set(linhasValidas.flatMap((l) => l.itensResolvidos.map((i) => i.item_id))),
  ];

  const compromissos: Compromisso[] = [];
  if (itemIdsEnvolvidos.length > 0) {
    const { data: existentes } = await supabase
      .from("itens_alugados")
      .select("item_id, quantidade, locacao:locacoes(status, data_entrega, data_recolher)")
      .in("item_id", itemIdsEnvolvidos);

    for (const linha of existentes ?? []) {
      const locacao = linha.locacao as unknown as {
        status: string;
        data_entrega: string;
        data_recolher: string;
      } | null;
      if (!locacao) continue;
      if (locacao.status === "Cancelada" || locacao.status === "Recolhida") continue;
      compromissos.push({
        item_id: linha.item_id,
        quantidade: linha.quantidade,
        data_entrega: locacao.data_entrega,
        data_recolher: locacao.data_recolher,
      });
    }
  }

  function comprometidoNoPeriodo(itemId: number, dataEntrega: string, dataRecolher: string) {
    return compromissos
      .filter(
        (c) =>
          c.item_id === itemId &&
          periodosSeSobrepoem(c.data_entrega, c.data_recolher, dataEntrega, dataRecolher),
      )
      .reduce((soma, c) => soma + c.quantidade, 0);
  }

  const linhasParaInserir: LinhaValidada[] = [];

  for (const linha of linhasValidas) {
    let itemSemEstoque: string | null = null;

    for (const item of linha.itensResolvidos) {
      const estoqueTotal = estoqueTotalPorId.get(item.item_id) ?? 0;
      const comprometido = comprometidoNoPeriodo(item.item_id, linha.data_entrega, linha.data_recolher);
      const disponivel = estoqueTotal - comprometido;
      if (item.quantidade > disponivel) {
        itemSemEstoque = `Item "${item.nome}": pedido ${item.quantidade}, disponível ${Math.max(0, disponivel)} no período.`;
        break;
      }
    }

    if (itemSemEstoque) {
      erros.push({ linha: linha.numeroLinha, mensagem: itemSemEstoque });
      continue;
    }

    // Reserva no "livro-caixa" em memória para as próximas linhas enxergarem.
    for (const item of linha.itensResolvidos) {
      compromissos.push({
        item_id: item.item_id,
        quantidade: item.quantidade,
        data_entrega: linha.data_entrega,
        data_recolher: linha.data_recolher,
      });
    }

    linhasParaInserir.push(linha);
  }

  // --- Passo 3: gravar tudo em duas idas ao banco (lote) ---
  let sucesso = 0;

  if (linhasParaInserir.length > 0) {
    const { data: novasLocacoes, error: locacaoError } = await supabase
      .from("locacoes")
      .insert(
        linhasParaInserir.map((l) => ({
          cliente_id: l.cliente_id,
          data: l.data,
          data_entrega: l.data_entrega,
          data_recolher: l.data_recolher,
          status: l.status,
          valor_frete: l.valor_frete,
        })),
      )
      .select("id");

    if (locacaoError || !novasLocacoes) {
      erros.push({
        linha: 0,
        mensagem: `Erro ao gravar locações em lote: ${locacaoError?.message}`,
      });
    } else {
      const itensAlugadosParaInserir = novasLocacoes.flatMap((novaLocacao, indice) =>
        linhasParaInserir[indice].itensResolvidos.map((item) => ({
          locacao_id: novaLocacao.id,
          item_id: item.item_id,
          quantidade: item.quantidade,
          preco_diaria: item.preco_diaria,
        })),
      );

      const { error: itensError } = await supabase
        .from("itens_alugados")
        .insert(itensAlugadosParaInserir);

      if (itensError) {
        erros.push({
          linha: 0,
          mensagem: `Locações gravadas, mas houve erro ao gravar os itens delas: ${itensError.message}`,
        });
      } else {
        sucesso = linhasParaInserir.length;
      }
    }
  }

  revalidatePath("/locacoes");
  revalidatePath("/itens");
  revalidatePath("/");
  return { totalLinhas: linhas.length, sucesso, erros };
}

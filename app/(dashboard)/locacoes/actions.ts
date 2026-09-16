"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { locacaoSchema } from "@/lib/validators/locacao";
import type { Item } from "@/lib/types";

export interface LocacaoFormState {
  errors?: Record<string, string[]>;
  formError?: string;
}

export interface DisponibilidadeResultado {
  item_id: number;
  nome: string;
  estoque_total: number;
  comprometido: number;
  disponivel: number;
  quantidade_solicitada: number;
  ok: boolean;
}

function parseLocacaoForm(formData: FormData) {
  let itens: unknown = [];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    itens = [];
  }

  return locacaoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    data: formData.get("data"),
    data_entrega: formData.get("data_entrega"),
    data_recolher: formData.get("data_recolher"),
    status: formData.get("status"),
    valor_frete: formData.get("valor_frete"),
    itens,
  });
}

/**
 * Confere, para cada item pedido, quanto já está comprometido em outras
 * locações que se sobrepõem ao período informado.
 */
export async function verificarDisponibilidade(
  itens: { item_id: number; quantidade: number }[],
  dataEntrega: string,
  dataRecolher: string,
  excluirLocacaoId?: number,
): Promise<DisponibilidadeResultado[]> {
  await requireUser();

  if (!dataEntrega || !dataRecolher || itens.length === 0) return [];

  const supabase = await createClient();
  const itemIds = itens.map((i) => i.item_id).filter((id) => Number.isFinite(id));
  if (itemIds.length === 0) return [];

  const { data: itensCadastrados } = await supabase
    .from("itens")
    .select("id, nome, estoque_total")
    .in("id", itemIds);

  const resultados: DisponibilidadeResultado[] = [];

  for (const pedido of itens) {
    const item = itensCadastrados?.find((i) => i.id === pedido.item_id);
    if (!item) continue;

    const { data: comprometido } = await supabase.rpc("estoque_comprometido", {
      p_item_id: pedido.item_id,
      p_data_entrega: dataEntrega,
      p_data_recolher: dataRecolher,
      p_excluir_locacao_id: excluirLocacaoId ?? null,
    });

    const comprometidoNum = Number(comprometido ?? 0);
    const disponivel = item.estoque_total - comprometidoNum;

    resultados.push({
      item_id: item.id,
      nome: item.nome,
      estoque_total: item.estoque_total,
      comprometido: comprometidoNum,
      disponivel,
      quantidade_solicitada: pedido.quantidade,
      ok: pedido.quantidade <= disponivel,
    });
  }

  return resultados;
}

async function validarDisponibilidadeOuErro(
  itens: { item_id: number; quantidade: number }[],
  dataEntrega: string,
  dataRecolher: string,
  excluirLocacaoId?: number,
): Promise<string | null> {
  const resultados = await verificarDisponibilidade(
    itens,
    dataEntrega,
    dataRecolher,
    excluirLocacaoId,
  );
  const problemas = resultados.filter((r) => !r.ok);

  if (problemas.length === 0) return null;

  return (
    "Estoque insuficiente no período para: " +
    problemas
      .map(
        (p) =>
          `${p.nome} (pedido ${p.quantidade_solicitada}, disponível ${Math.max(0, p.disponivel)})`,
      )
      .join("; ")
  );
}

export async function createLocacao(
  _prevState: LocacaoFormState,
  formData: FormData,
): Promise<LocacaoFormState> {
  await requireUser();

  const parsed = parseLocacaoForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { itens, ...locacao } = parsed.data;

  const disponibilidadeErro = await validarDisponibilidadeOuErro(
    itens,
    locacao.data_entrega,
    locacao.data_recolher,
  );
  if (disponibilidadeErro) {
    return { formError: disponibilidadeErro };
  }

  const supabase = await createClient();
  const { data: novaLocacao, error } = await supabase
    .from("locacoes")
    .insert(locacao)
    .select("id")
    .single();

  if (error || !novaLocacao) {
    return { formError: `Erro ao salvar locação: ${error?.message}` };
  }

  const itensParaInserir = await preencherPrecoDiaria(itens, novaLocacao.id);
  const { error: itensError } = await supabase
    .from("itens_alugados")
    .insert(itensParaInserir);

  if (itensError) {
    return { formError: `Erro ao salvar itens da locação: ${itensError.message}` };
  }

  revalidatePath("/locacoes");
  revalidatePath("/itens");
  revalidatePath("/");
  redirect("/locacoes");
}

export async function updateLocacao(
  id: number,
  _prevState: LocacaoFormState,
  formData: FormData,
): Promise<LocacaoFormState> {
  await requireUser();

  const parsed = parseLocacaoForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { itens, ...locacao } = parsed.data;

  const disponibilidadeErro = await validarDisponibilidadeOuErro(
    itens,
    locacao.data_entrega,
    locacao.data_recolher,
    id,
  );
  if (disponibilidadeErro) {
    return { formError: disponibilidadeErro };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("locacoes").update(locacao).eq("id", id);

  if (error) {
    return { formError: `Erro ao salvar locação: ${error.message}` };
  }

  await supabase.from("itens_alugados").delete().eq("locacao_id", id);
  const itensParaInserir = await preencherPrecoDiaria(itens, id);
  const { error: itensError } = await supabase
    .from("itens_alugados")
    .insert(itensParaInserir);

  if (itensError) {
    return { formError: `Erro ao salvar itens da locação: ${itensError.message}` };
  }

  revalidatePath("/locacoes");
  revalidatePath("/itens");
  revalidatePath("/");
  redirect("/locacoes");
}

async function preencherPrecoDiaria(
  itens: { item_id: number; quantidade: number }[],
  locacaoId: number,
) {
  const supabase = await createClient();
  const itemIds = itens.map((i) => i.item_id);
  const { data: itensCadastrados } = await supabase
    .from("itens")
    .select("id, preco_diaria")
    .in("id", itemIds);

  const precoPorId = new Map<number, number>(
    (itensCadastrados as Pick<Item, "id" | "preco_diaria">[] | null)?.map((i) => [
      i.id,
      i.preco_diaria,
    ]) ?? [],
  );

  return itens.map((i) => ({
    locacao_id: locacaoId,
    item_id: i.item_id,
    quantidade: i.quantidade,
    preco_diaria: precoPorId.get(i.item_id) ?? 0,
  }));
}

export async function deleteLocacao(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("locacoes").delete().eq("id", id);

  if (error) {
    throw new Error(`Não foi possível excluir a locação: ${error.message}`);
  }

  revalidatePath("/locacoes");
  revalidatePath("/itens");
  revalidatePath("/");
}

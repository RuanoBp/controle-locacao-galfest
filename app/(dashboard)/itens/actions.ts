"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validators/item";

export interface ItemFormState {
  errors?: Record<string, string[]>;
  formError?: string;
}

function parseItemForm(formData: FormData) {
  return itemSchema.safeParse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria"),
    estoque_total: formData.get("estoque_total"),
    preco_diaria: formData.get("preco_diaria"),
    custo_aquisicao: formData.get("custo_aquisicao"),
  });
}

export async function createItem(
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requireUser();

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("itens").insert(parsed.data);

  if (error) {
    return { formError: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/itens");
  redirect("/itens");
}

export async function updateItem(
  id: number,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requireUser();

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("itens").update(parsed.data).eq("id", id);

  if (error) {
    return { formError: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/itens");
  redirect("/itens");
}

export async function deleteItem(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("itens").delete().eq("id", id);

  if (error) {
    throw new Error(
      `Não foi possível excluir: este item provavelmente está vinculado a uma locação. (${error.message})`,
    );
  }

  revalidatePath("/itens");
}

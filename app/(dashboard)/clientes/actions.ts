"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema } from "@/lib/validators/cliente";

export interface ClienteFormState {
  errors?: Record<string, string[]>;
  formError?: string;
}

function parseClienteForm(formData: FormData) {
  return clienteSchema.safeParse({
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    cidade_bairro: formData.get("cidade_bairro"),
    telefone: formData.get("telefone"),
  });
}

export async function createCliente(
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireUser();

  const parsed = parseClienteForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").insert(parsed.data);

  if (error) {
    return { formError: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCliente(
  id: number,
  _prevState: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await requireUser();

  const parsed = parseClienteForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { formError: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCliente(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    throw new Error(
      `Não foi possível excluir: este cliente provavelmente possui locações. (${error.message})`,
    );
  }

  revalidatePath("/clientes");
}

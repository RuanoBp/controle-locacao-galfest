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

export interface DeleteEmMassaResultado {
  sucesso: number;
  erro?: string;
}

export async function deleteClientesEmMassa(ids: number[]): Promise<DeleteEmMassaResultado> {
  await requireUser();
  if (ids.length === 0) return { sucesso: 0 };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("clientes")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) {
    return {
      sucesso: 0,
      erro: `Não foi possível excluir: um ou mais clientes provavelmente possuem locações. (${error.message})`,
    };
  }

  revalidatePath("/clientes");
  return { sucesso: count ?? ids.length };
}

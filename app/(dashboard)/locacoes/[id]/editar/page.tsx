import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocacaoForm } from "../../locacao-form";
import { updateLocacao } from "../../actions";
import type { Cliente, Item, LocacaoComRelacoes } from "@/lib/types";

export const metadata = { title: "Editar locação" };

export default async function EditarLocacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: locacao }, { data: clientes }, { data: itens }] = await Promise.all([
    supabase
      .from("locacoes")
      .select(
        "*, cliente:clientes(*), itens_alugados(*, item:itens(*))",
      )
      .eq("id", id)
      .maybeSingle() as unknown as Promise<{ data: LocacaoComRelacoes | null }>,
    supabase.from("clientes").select("*").order("nome") as unknown as Promise<{
      data: Cliente[] | null;
    }>,
    supabase.from("itens").select("*").order("nome") as unknown as Promise<{
      data: Item[] | null;
    }>,
  ]);

  if (!locacao) {
    notFound();
  }

  const updateLocacaoWithId = updateLocacao.bind(null, locacao.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Editar locação: {locacao.cliente?.nome}
      </h1>
      <LocacaoForm
        clientes={clientes ?? []}
        itens={itens ?? []}
        locacao={locacao}
        action={updateLocacaoWithId}
      />
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import type { ItemComEstoque } from "@/lib/types";
import { ItensTable } from "./itens-table";

export const metadata = { title: "Itens" };

export default async function ItensPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: itens, error } = await supabase
    .from("v_itens_estoque")
    .select("*")
    .order("nome") as { data: ItemComEstoque[] | null; error: unknown };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Itens</h1>
          <p className="text-sm text-slate-500">
            Estoque disponível considera as locações ativas de hoje.
          </p>
        </div>
        <LinkButton href="/itens/novo">Novo item</LinkButton>
      </div>

      {error ? (
        <p className="text-sm text-red-600">
          Erro ao carregar itens. Verifique a conexão com o Supabase.
        </p>
      ) : (
        <ItensTable itens={itens ?? []} />
      )}
    </div>
  );
}

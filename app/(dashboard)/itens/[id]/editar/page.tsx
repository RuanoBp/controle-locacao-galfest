import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ItemForm } from "../../item-form";
import { updateItem } from "../../actions";
import type { Item } from "@/lib/types";

export const metadata = { title: "Editar item" };

export default async function EditarItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("itens")
    .select("*")
    .eq("id", id)
    .maybeSingle<Item>();

  if (!item) {
    notFound();
  }

  const updateItemWithId = updateItem.bind(null, item.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Editar item: {item.nome}
      </h1>
      <ItemForm item={item} action={updateItemWithId} />
    </div>
  );
}

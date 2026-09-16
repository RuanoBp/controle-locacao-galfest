import { requireUser } from "@/lib/auth";
import { ItemForm } from "../item-form";
import { createItem } from "../actions";

export const metadata = { title: "Novo item" };

export default async function NovoItemPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Novo item</h1>
      <ItemForm action={createItem} />
    </div>
  );
}

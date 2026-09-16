"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import type { Item } from "@/lib/types";
import type { ItemFormState } from "./actions";

type ItemAction = (
  prevState: ItemFormState,
  formData: FormData,
) => Promise<ItemFormState>;

export function ItemForm({
  item,
  action,
}: {
  item?: Item;
  action: ItemAction;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <FormField label="Nome" htmlFor="nome" required error={errors.nome}>
        <Input id="nome" name="nome" defaultValue={item?.nome} required />
      </FormField>

      <FormField
        label="Categoria"
        htmlFor="categoria"
        required
        error={errors.categoria}
      >
        <Input
          id="categoria"
          name="categoria"
          list="categorias-sugeridas"
          defaultValue={item?.categoria}
          required
        />
        <datalist id="categorias-sugeridas">
          <option value="Mobiliário" />
          <option value="Louça" />
          <option value="Decoração" />
          <option value="Som/Iluminação" />
          <option value="Cobertura/Estrutura" />
          <option value="Enxoval" />
        </datalist>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          label="Estoque Total"
          htmlFor="estoque_total"
          required
          error={errors.estoque_total}
        >
          <Input
            id="estoque_total"
            name="estoque_total"
            type="number"
            min={0}
            step={1}
            defaultValue={item?.estoque_total ?? 0}
            required
          />
        </FormField>

        <FormField
          label="Preço Diária (R$)"
          htmlFor="preco_diaria"
          required
          error={errors.preco_diaria}
        >
          <Input
            id="preco_diaria"
            name="preco_diaria"
            type="number"
            min={0}
            step="0.01"
            defaultValue={item?.preco_diaria ?? 0}
            required
          />
        </FormField>

        <FormField
          label="Custo de Aquisição (R$)"
          htmlFor="custo_aquisicao"
          error={errors.custo_aquisicao}
        >
          <Input
            id="custo_aquisicao"
            name="custo_aquisicao"
            type="number"
            min={0}
            step="0.01"
            defaultValue={item?.custo_aquisicao ?? 0}
          />
        </FormField>
      </div>

      {state.formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <LinkButton href="/itens" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { TIPOS_CLIENTE } from "@/lib/types";
import type { Cliente } from "@/lib/types";
import type { ClienteFormState } from "./actions";

type ClienteAction = (
  prevState: ClienteFormState,
  formData: FormData,
) => Promise<ClienteFormState>;

export function ClienteForm({
  cliente,
  action,
}: {
  cliente?: Cliente;
  action: ClienteAction;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <FormField label="Nome do Cliente" htmlFor="nome" required error={errors.nome}>
        <Input id="nome" name="nome" defaultValue={cliente?.nome} required />
      </FormField>

      <FormField label="Tipo de Cliente" htmlFor="tipo" required error={errors.tipo}>
        <Select id="tipo" name="tipo" defaultValue={cliente?.tipo ?? TIPOS_CLIENTE[0]}>
          {TIPOS_CLIENTE.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Cidade ou Bairro"
        htmlFor="cidade_bairro"
        error={errors.cidade_bairro}
      >
        <Input
          id="cidade_bairro"
          name="cidade_bairro"
          defaultValue={cliente?.cidade_bairro ?? ""}
        />
      </FormField>

      <FormField label="Telefone" htmlFor="telefone" error={errors.telefone}>
        <PhoneInput
          id="telefone"
          name="telefone"
          defaultValue={cliente?.telefone ?? ""}
        />
      </FormField>

      {state.formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <LinkButton href="/clientes" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}

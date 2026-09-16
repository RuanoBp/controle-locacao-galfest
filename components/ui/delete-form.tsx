"use client";

import { Button } from "@/components/ui/button";

export function DeleteForm({
  action,
  id,
  confirmMessage = "Tem certeza que deseja excluir?",
}: {
  action: (formData: FormData) => Promise<void>;
  id: number;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="danger" type="submit">
        Excluir
      </Button>
    </form>
  );
}

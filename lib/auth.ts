import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante que existe um usuário autenticado. Use no início de toda
 * Server Action e de todo Server Component de dados sensíveis — o proxy.ts
 * protege a navegação normal, mas Server Functions podem ser chamadas
 * diretamente por POST, então cada uma precisa checar por conta própria.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

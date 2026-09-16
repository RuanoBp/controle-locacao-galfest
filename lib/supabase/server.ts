import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e no proxy.
 * Lê/escreve a sessão através dos cookies da requisição.
 *
 * Envolvido em `cache()` para que todo o layout + página (e uma Server
 * Action e suas chamadas internas) compartilhem a MESMA instância dentro
 * de uma única requisição, em vez de cada `createClient()` criar um
 * cliente (e uma verificação de sessão) independente.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // chamado a partir de um Server Component (sem permissão de escrita);
            // o proxy.ts já cuida de renovar a sessão nesses casos.
          }
        },
      },
    },
  );
});

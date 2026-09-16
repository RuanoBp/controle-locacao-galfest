import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto arquivos estáticos e de imagem,
     * para não bloquear CSS/JS/ícones.
     */
    "/((?!_next/static|_next/image|favicon.ico|modelos/).*)",
  ],
};

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { AbaBI } from "@/lib/bi/types";

interface BITabsProps {
  abaAtiva: AbaBI;
}

export function BITabs({ abaAtiva }: BITabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const mudarAba = useCallback(
    (novaAba: AbaBI) => {
      const params = new URLSearchParams(searchParams.toString());
      if (novaAba === "financeiro") {
        params.delete("tab");
      } else {
        params.set("tab", novaAba);
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const abas: { id: AbaBI; rotulo: string; descricao: string; icone: string }[] = [
    {
      id: "financeiro",
      rotulo: "Visão Financeira",
      descricao: "Receita, ticket médio, evolução temporal, categorias e itens mais rentáveis",
      icone: "💰",
    },
    {
      id: "operacional",
      rotulo: "Visão Operacional",
      descricao: "Tempo médio de locação, status dos pedidos, giro de estoque, entregas e recolhimentos",
      icone: "📦",
    },
  ];

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <nav
        className="grid grid-cols-2 w-full border-b border-slate-200"
        aria-label="Abas do Dashboard"
      >
        {abas.map((aba) => {
          const ativa = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => mudarAba(aba.id)}
              className={`w-full py-4 px-3 sm:px-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center border-b-4 -mb-[1px] ${
                ativa
                  ? "border-slate-900 bg-slate-50 text-slate-900 font-bold"
                  : "border-transparent bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50/70 font-semibold"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">{aba.icone}</span>
                <span className="text-sm sm:text-base tracking-tight">
                  {aba.rotulo}
                </span>
              </div>
              <span
                className={`mt-1 hidden sm:block text-xs ${
                  ativa ? "font-semibold text-slate-800" : "font-normal text-slate-500"
                }`}
              >
                {aba.descricao}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

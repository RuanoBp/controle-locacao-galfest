import { cn } from "@/lib/utils";
import type { StatusLocacao } from "@/lib/types";

const STATUS_TONE: Record<StatusLocacao, string> = {
  Orçamento: "bg-slate-100 text-slate-700",
  Confirmada: "bg-blue-100 text-blue-700",
  Entregue: "bg-emerald-100 text-emerald-700",
  Recolhida: "bg-slate-200 text-slate-600",
  Atrasada: "bg-red-100 text-red-700",
  Cancelada: "bg-slate-100 text-slate-400 line-through",
};

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status as StatusLocacao] ?? "bg-slate-100 text-slate-700";
  return <Badge className={tone}>{status}</Badge>;
}

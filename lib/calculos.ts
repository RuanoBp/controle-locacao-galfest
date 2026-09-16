/** Número de diárias entre a entrega e o recolhimento (mínimo 1). */
export function numeroDiarias(dataEntrega: string, dataRecolher: string): number {
  const entrega = new Date(dataEntrega);
  const recolher = new Date(dataRecolher);
  const dias = Math.round(
    (recolher.getTime() - entrega.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, dias);
}

export function valorItensLocacao(
  itens: { quantidade: number; preco_diaria: number }[],
  dataEntrega: string,
  dataRecolher: string,
): number {
  const diarias = numeroDiarias(dataEntrega, dataRecolher);
  return itens.reduce(
    (total, item) => total + item.quantidade * item.preco_diaria * diarias,
    0,
  );
}

export function valorTotalLocacao(params: {
  itens: { quantidade: number; preco_diaria: number }[];
  data_entrega: string;
  data_recolher: string;
  valor_frete: number;
}): number {
  return (
    valorItensLocacao(params.itens, params.data_entrega, params.data_recolher) +
    params.valor_frete
  );
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor ?? 0);
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function somarDias(dataISO: string, dias: number): string {
  const data = new Date(dataISO + "T00:00:00");
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function estaAtrasada(status: string, dataRecolher: string): boolean {
  return (
    status !== "Recolhida" &&
    status !== "Cancelada" &&
    dataRecolher < hojeISO()
  );
}

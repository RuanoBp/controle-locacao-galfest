export function valorItensLocacao(
  itens: { quantidade: number; preco_diaria: number }[],
  diarias: number,
): number {
  const numDiarias = Math.max(1, Math.floor(Number(diarias) || 1));
  return itens.reduce(
    (total, item) => total + item.quantidade * item.preco_diaria * numDiarias,
    0,
  );
}

/** Valor total = soma(quantidade × preço diária × nº de diárias) + frete. */
export function valorTotalLocacao(params: {
  itens: { quantidade: number; preco_diaria: number }[];
  diarias: number;
  valor_frete: number;
}): number {
  return valorItensLocacao(params.itens, params.diarias) + Number(params.valor_frete ?? 0);
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

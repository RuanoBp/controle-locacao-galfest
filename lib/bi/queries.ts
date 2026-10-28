import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FiltrosBI,
  DadosDashboardBI,
  PontoEvolucaoMensal,
  PontoCategoria,
  PontoTipoCliente,
  PontoStatus,
  PontoItemRanking,
  DimCategoriaItem,
  DimTipoCliente,
  DimStatusLocacao,
} from "./types";

interface LinhaFatoBI {
  id: number;
  id_locacao: number;
  id_cliente: number;
  cliente_nome: string | null;
  id_tipo_cliente: number | null;
  tipo_cliente: string | null;
  id_item: number;
  nome_item: string | null;
  id_categoria: number | null;
  nome_categoria: string | null;
  id_status: number;
  status: string | null;
  quantidade: number;
  preco_diaria: number;
  valor_item: number;
  id_data_entrega: number;
  data_entrega: string | null;
  ano_entrega: number | null;
  mes_entrega: number | null;
  nome_mes_entrega: string | null;
  trimestre_entrega: number | null;
}

export async function buscarDadosBI(
  supabase: SupabaseClient,
  filtros: FiltrosBI,
): Promise<{ dados: DadosDashboardBI; erroMigracao?: boolean }> {
  // 1. Busca opções disponíveis para os filtros
  const [
    { data: categorias },
    { data: tiposCliente },
    { data: statusList },
    { data: fatos, error: erroFato },
  ] = await Promise.all([
    supabase.from("dim_categoria_item").select("id_categoria, nome_categoria").order("nome_categoria"),
    supabase.from("dim_tipo_cliente").select("id_tipo_cliente, descricao").order("id_tipo_cliente"),
    supabase.from("dim_status_locacao").select("id_status, descricao_status").order("id_status"),
    executarQueryFato(supabase, filtros),
  ]);

  if (erroFato) {
    // Se a view ou tabela dimensional ainda não existir no Supabase
    return {
      dados: obterDadosVazios(),
      erroMigracao: true,
    };
  }

  const linhas = (fatos ?? []) as LinhaFatoBI[];

  // 2. Cálculo dos KPIs principais
  const contratosUnicos = new Set<number>();
  let faturamentoTotal = 0;
  let totalPecasAlugadas = 0;
  let somaPrecoDiaria = 0;

  for (const row of linhas) {
    contratosUnicos.add(row.id_locacao);
    faturamentoTotal += Number(row.valor_item) || 0;
    totalPecasAlugadas += Number(row.quantidade) || 0;
    somaPrecoDiaria += Number(row.preco_diaria) || 0;
  }

  const totalContratos = contratosUnicos.size;
  const ticketMedio = totalContratos > 0 ? faturamentoTotal / totalContratos : 0;
  const precoMedioDiaria = linhas.length > 0 ? somaPrecoDiaria / linhas.length : 0;

  // 3. Agrupamento: Evolução Temporal (Mês a Mês)
  const mapaMeses = new Map<number, { rotulo: string; faturamento: number; contratos: Set<number> }>();
  const NOMES_MESES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  for (let m = 1; m <= 12; m++) {
    mapaMeses.set(m, {
      rotulo: NOMES_MESES[m - 1],
      faturamento: 0,
      contratos: new Set<number>(),
    });
  }

  for (const row of linhas) {
    const mes = row.mes_entrega;
    if (mes && mapaMeses.has(mes)) {
      const entry = mapaMeses.get(mes)!;
      entry.faturamento += Number(row.valor_item) || 0;
      entry.contratos.add(row.id_locacao);
    }
  }

  const evolucaoMensal: PontoEvolucaoMensal[] = Array.from(mapaMeses.entries()).map(
    ([mesNum, info]) => ({
      mesNumero: mesNum,
      rotulo: info.rotulo,
      faturamento: Math.round(info.faturamento * 100) / 100,
      volumeContratos: info.contratos.size,
    }),
  );

  // 4. Agrupamento: Faturamento por Categoria
  const mapaCategorias = new Map<string, { id: number; faturamento: number; quantidade: number }>();
  for (const row of linhas) {
    const catNome = row.nome_categoria || "Sem categoria";
    const atual = mapaCategorias.get(catNome) ?? {
      id: row.id_categoria || 0,
      faturamento: 0,
      quantidade: 0,
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.quantidade += Number(row.quantidade) || 0;
    mapaCategorias.set(catNome, atual);
  }

  const faturamentoPorCategoria: PontoCategoria[] = Array.from(mapaCategorias.entries())
    .map(([categoria, info]) => ({
      id: info.id,
      categoria,
      faturamento: Math.round(info.faturamento * 100) / 100,
      quantidade: info.quantidade,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  // 5. Agrupamento: Faturamento por Perfil de Cliente
  const mapaTiposCliente = new Map<string, { id: number; faturamento: number; contratos: Set<number> }>();
  for (const row of linhas) {
    const tipo = row.tipo_cliente || "Outro";
    const atual = mapaTiposCliente.get(tipo) ?? {
      id: row.id_tipo_cliente || 0,
      faturamento: 0,
      contratos: new Set<number>(),
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.contratos.add(row.id_locacao);
    mapaTiposCliente.set(tipo, atual);
  }

  const faturamentoPorTipoCliente: PontoTipoCliente[] = Array.from(mapaTiposCliente.entries())
    .map(([tipo, info]) => ({
      id: info.id,
      tipo,
      faturamento: Math.round(info.faturamento * 100) / 100,
      contratos: info.contratos.size,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  // 6. Agrupamento: Faturamento e Contagem por Status
  const mapaStatus = new Map<string, { id: number; faturamento: number; quantidade: number }>();
  for (const row of linhas) {
    const st = row.status || "Indefinido";
    const atual = mapaStatus.get(st) ?? {
      id: row.id_status || 0,
      faturamento: 0,
      quantidade: 0,
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.quantidade += 1;
    mapaStatus.set(st, atual);
  }

  const locacoesPorStatus: PontoStatus[] = Array.from(mapaStatus.entries()).map(
    ([status, info]) => ({
      id: info.id,
      status,
      faturamento: Math.round(info.faturamento * 100) / 100,
      quantidade: info.quantidade,
    }),
  );

  // 7. Agrupamento: Top 10 Itens Mais Rentáveis
  const mapaItens = new Map<
    number,
    { nome: string; categoria: string; faturamento: number; quantidadeTotal: number }
  >();

  for (const row of linhas) {
    const idItem = row.id_item;
    const atual = mapaItens.get(idItem) ?? {
      nome: row.nome_item || `Item #${idItem}`,
      categoria: row.nome_categoria || "Sem categoria",
      faturamento: 0,
      quantidadeTotal: 0,
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.quantidadeTotal += Number(row.quantidade) || 0;
    mapaItens.set(idItem, atual);
  }

  const topItens: PontoItemRanking[] = Array.from(mapaItens.entries())
    .map(([id, info]) => ({
      id,
      nome: info.nome,
      categoria: info.categoria,
      faturamento: Math.round(info.faturamento * 100) / 100,
      quantidadeTotal: info.quantidadeTotal,
    }))
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 10);

  // 8. Anos disponíveis para filtro
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];

  return {
    dados: {
      kpis: {
        faturamentoTotal: Math.round(faturamentoTotal * 100) / 100,
        totalContratos,
        totalPecasAlugadas,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        precoMedioDiaria: Math.round(precoMedioDiaria * 100) / 100,
      },
      evolucaoMensal,
      faturamentoPorCategoria,
      faturamentoPorTipoCliente,
      locacoesPorStatus,
      topItens,
      opcoesFiltros: {
        anos: anosDisponiveis,
        categorias: (categorias ?? []) as DimCategoriaItem[],
        tiposCliente: (tiposCliente ?? []) as DimTipoCliente[],
        statusList: (statusList ?? []) as DimStatusLocacao[],
      },
    },
  };
}

async function executarQueryFato(supabase: SupabaseClient, filtros: FiltrosBI) {
  let query = supabase.from("v_bi_fato_completa").select("*");

  // Filtro por Ano
  if (filtros.ano) {
    query = query.eq("ano_entrega", Number(filtros.ano));
  }

  // Filtro por Mês
  if (filtros.mes) {
    query = query.eq("mes_entrega", Number(filtros.mes));
  }

  // Filtro por Trimestre
  if (filtros.trimestre) {
    query = query.eq("trimestre_entrega", Number(filtros.trimestre));
  }

  // Filtro por intervalo de datas (De / Até)
  if (filtros.de) {
    const idDataDe = Number(filtros.de.replace(/-/g, ""));
    query = query.gte("id_data_entrega", idDataDe);
  }
  if (filtros.ate) {
    const idDataAte = Number(filtros.ate.replace(/-/g, ""));
    query = query.lte("id_data_entrega", idDataAte);
  }

  // Filtro por Categoria
  if (filtros.categoria_id) {
    query = query.eq("id_categoria", Number(filtros.categoria_id));
  }

  // Filtro por Tipo de Cliente
  if (filtros.tipo_cliente_id) {
    query = query.eq("id_tipo_cliente", Number(filtros.tipo_cliente_id));
  }

  // Filtro por Status
  if (filtros.status_id) {
    query = query.eq("id_status", Number(filtros.status_id));
  }

  return query;
}

function obterDadosVazios(): DadosDashboardBI {
  return {
    kpis: {
      faturamentoTotal: 0,
      totalContratos: 0,
      totalPecasAlugadas: 0,
      ticketMedio: 0,
      precoMedioDiaria: 0,
    },
    evolucaoMensal: [],
    faturamentoPorCategoria: [],
    faturamentoPorTipoCliente: [],
    locacoesPorStatus: [],
    topItens: [],
    opcoesFiltros: {
      anos: [new Date().getFullYear()],
      categorias: [],
      tiposCliente: [],
      statusList: [],
    },
  };
}

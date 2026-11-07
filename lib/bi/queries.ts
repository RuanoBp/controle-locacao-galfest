import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FiltrosBI,
  DadosDashboardBI,
  PontoEvolucaoMensal,
  PontoDiario,
  FimDeSemanaCampeao,
  PontoCategoria,
  PontoTipoCliente,
  PontoStatus,
  PontoItemRanking,
  DimCategoriaItem,
  DimTipoCliente,
  DimStatusLocacao,
} from "./types";
import { hojeISO } from "@/lib/calculos";

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
  dia_semana_entrega: string | null;
  data_recolhimento: string | null;
}

export async function buscarDadosBI(
  supabase: SupabaseClient,
  filtros: FiltrosBI,
): Promise<{ dados: DadosDashboardBI; erroMigracao?: boolean }> {
  // 1. Busca opções disponíveis para os filtros e as linhas da fato
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
    return {
      dados: obterDadosVazios(),
      erroMigracao: true,
    };
  }

  const linhas = (fatos ?? []) as LinhaFatoBI[];

  // 2. Mapeamento de contratos únicos para métricas gerais e operacionais
  interface InfoContrato {
    idLocacao: number;
    status: string;
    dataEntrega: string | null;
    dataRecolhimento: string | null;
    faturamento: number;
  }

  const mapaContratos = new Map<number, InfoContrato>();
  let faturamentoTotal = 0;
  let totalPecasAlugadas = 0;
  let somaPrecoDiaria = 0;

  for (const row of linhas) {
    faturamentoTotal += Number(row.valor_item) || 0;
    totalPecasAlugadas += Number(row.quantidade) || 0;
    somaPrecoDiaria += Number(row.preco_diaria) || 0;

    if (!mapaContratos.has(row.id_locacao)) {
      mapaContratos.set(row.id_locacao, {
        idLocacao: row.id_locacao,
        status: row.status || "Indefinido",
        dataEntrega: row.data_entrega,
        dataRecolhimento: row.data_recolhimento,
        faturamento: 0,
      });
    }

    const c = mapaContratos.get(row.id_locacao)!;
    c.faturamento += Number(row.valor_item) || 0;
  }

  const totalContratos = mapaContratos.size;
  const ticketMedio = totalContratos > 0 ? faturamentoTotal / totalContratos : 0;
  const precoMedioDiaria = linhas.length > 0 ? somaPrecoDiaria / linhas.length : 0;

  // 2.1. Métricas Operacionais solicitadas pela Michelle:
  // - Tempo médio de locação (dias em que o item fica com o cliente)
  // - Tempo médio de atraso (dias passados desde a data de recolhimento para locações atrasadas)
  const hoje = hojeISO();
  let somaDiasLocacao = 0;
  let qtdContratosComDatas = 0;
  let somaDiasAtraso = 0;
  let qtdContratosAtrasados = 0;

  for (const c of mapaContratos.values()) {
    if (c.dataEntrega && c.dataRecolhimento) {
      const dtEntrega = new Date(c.dataEntrega + "T00:00:00");
      const dtRecolher = new Date(c.dataRecolhimento + "T00:00:00");
      const diffMs = dtRecolher.getTime() - dtEntrega.getTime();
      const dias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      somaDiasLocacao += dias;
      qtdContratosComDatas++;
    }

    if (c.status === "Atrasada" && c.dataRecolhimento) {
      const dtRecolher = new Date(c.dataRecolhimento + "T00:00:00");
      const dtHoje = new Date(hoje + "T00:00:00");
      const diffAtrasoMs = dtHoje.getTime() - dtRecolher.getTime();
      const diasAtraso = Math.max(1, Math.round(diffAtrasoMs / (1000 * 60 * 60 * 24)));
      somaDiasAtraso += diasAtraso;
      qtdContratosAtrasados++;
    }
  }

  const tempoMedioLocacaoDias =
    qtdContratosComDatas > 0
      ? Math.round((somaDiasLocacao / qtdContratosComDatas) * 10) / 10
      : 0;

  const mediaDiasAtraso =
    qtdContratosAtrasados > 0
      ? Math.round((somaDiasAtraso / qtdContratosAtrasados) * 10) / 10
      : 0;

  // 3. Agrupamento: Evolução Temporal Mensal (Janeiro a Dezembro)
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

  // 4. Agrupamento Diário e Análise de Finais de Semana Mais Rentáveis
  // Quando filtrado por mês ou data específica (ou todos os dados do período)
  const mapaDias = new Map<
    string,
    { dia: number; diaSemana: string; faturamento: number; contratos: Set<number>; ehFimDeSemana: boolean }
  >();

  for (const row of linhas) {
    if (!row.data_entrega) continue;
    const dataStr = row.data_entrega;
    const diaNum = Number(dataStr.slice(8, 10));
    const ds = row.dia_semana_entrega || "";
    const ehFds = ds.toLowerCase().includes("sábado") ||
                  ds.toLowerCase().includes("sabado") ||
                  ds.toLowerCase().includes("domingo") ||
                  ds.toLowerCase().includes("sexta");

    const atual = mapaDias.get(dataStr) ?? {
      dia: diaNum,
      diaSemana: ds.split("-")[0] || ds, // Ex: "Sexta" em vez de "Sexta-feira"
      faturamento: 0,
      contratos: new Set<number>(),
      ehFimDeSemana: ehFds,
    };

    atual.faturamento += Number(row.valor_item) || 0;
    atual.contratos.add(row.id_locacao);
    mapaDias.set(dataStr, atual);
  }

  const evolucaoDiaria: PontoDiario[] = Array.from(mapaDias.entries())
    .map(([data, info]) => ({
      data,
      dia: info.dia,
      diaSemana: info.diaSemana,
      faturamento: Math.round(info.faturamento * 100) / 100,
      volumeContratos: info.contratos.size,
      ehFimDeSemana: info.ehFimDeSemana,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // 4.1 Identificação do Fim de Semana Mais Rentável
  // Agrupa blocos de fim de semana (Sexta, Sábado e Domingo consecutivos)
  const mapaFinsDeSemana = new Map<
    string,
    { rotulo: string; dataInicio: string; dataFim: string; faturamento: number; contratos: Set<number> }
  >();

  for (const diaInfo of evolucaoDiaria) {
    if (diaInfo.ehFimDeSemana) {
      const dt = new Date(diaInfo.data + "T00:00:00");
      const diaDaSemana = dt.getDay(); // 0: Dom, 5: Sex, 6: Sáb
      // Encontra a sexta-feira correspondente ao fim de semana
      const diffParaSexta = diaDaSemana === 0 ? -2 : diaDaSemana === 6 ? -1 : 0;
      const sexta = new Date(dt);
      sexta.setDate(sexta.getDate() + diffParaSexta);
      const domingo = new Date(sexta);
      domingo.setDate(domingo.getDate() + 2);

      const chaveFds = sexta.toISOString().slice(0, 10);
      const rotulo = `${sexta.getDate().toString().padStart(2, "0")} a ${domingo
        .getDate()
        .toString()
        .padStart(2, "0")}/${(domingo.getMonth() + 1).toString().padStart(2, "0")}`;

      const atualFds = mapaFinsDeSemana.get(chaveFds) ?? {
        rotulo,
        dataInicio: chaveFds,
        dataFim: domingo.toISOString().slice(0, 10),
        faturamento: 0,
        contratos: new Set<number>(),
      };

      atualFds.faturamento += diaInfo.faturamento;
      // Adiciona contratos desse dia
      const diaOriginal = mapaDias.get(diaInfo.data);
      if (diaOriginal) {
        diaOriginal.contratos.forEach((id) => atualFds.contratos.add(id));
      }
      mapaFinsDeSemana.set(chaveFds, atualFds);
    }
  }

  let fimDeSemanaCampeao: FimDeSemanaCampeao | null = null;
  let maiorFaturamentoFds = 0;

  for (const fds of mapaFinsDeSemana.values()) {
    if (fds.faturamento > maiorFaturamentoFds) {
      maiorFaturamentoFds = fds.faturamento;
      fimDeSemanaCampeao = {
        rotulo: fds.rotulo,
        dataInicio: fds.dataInicio,
        dataFim: fds.dataFim,
        faturamento: Math.round(fds.faturamento * 100) / 100,
        contratos: fds.contratos.size,
      };
    }
  }

  // 5. Agrupamento: Faturamento por Categoria
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

  // 6. Agrupamento: Faturamento por Perfil de Cliente
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

  // 7. Agrupamento: Locações por Status (com percentual relativo e ordenação consistente)
  const mapaStatus = new Map<string, { id: number; faturamento: number; contratos: Set<number> }>();
  for (const row of linhas) {
    const st = row.status || "Indefinido";
    const atual = mapaStatus.get(st) ?? {
      id: row.id_status || 0,
      faturamento: 0,
      contratos: new Set<number>(),
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.contratos.add(row.id_locacao);
    mapaStatus.set(st, atual);
  }

  const totalLocacoesStatus = Array.from(mapaStatus.values()).reduce(
    (acc, curr) => acc + curr.contratos.size,
    0,
  );

  const locacoesPorStatus: PontoStatus[] = Array.from(mapaStatus.entries())
    .map(([status, info]) => {
      const qtd = info.contratos.size;
      const pct = totalLocacoesStatus > 0 ? (qtd / totalLocacoesStatus) * 100 : 0;
      return {
        id: info.id,
        status,
        faturamento: Math.round(info.faturamento * 100) / 100,
        quantidade: qtd,
        percentual: Math.round(pct * 10) / 10,
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);

  // 8. Agrupamento: Top 10 Itens Mais Rentáveis
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

  // 9. Anos disponíveis para filtro
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
        tempoMedioLocacaoDias,
        mediaDiasAtraso,
        locacoesAtrasadasQtd: qtdContratosAtrasados,
      },
      evolucaoMensal,
      evolucaoDiaria,
      fimDeSemanaCampeao,
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

  // Filtro por intervalo de datas livres (De / Até)
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
      tempoMedioLocacaoDias: 0,
      mediaDiasAtraso: 0,
      locacoesAtrasadasQtd: 0,
    },
    evolucaoMensal: [],
    evolucaoDiaria: [],
    fimDeSemanaCampeao: null,
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

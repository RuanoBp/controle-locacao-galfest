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
  ResumoLocacaoDia,
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

  // 3. Agrupamento Diário e Análise de Finais de Semana Mais Rentáveis
  const mapaDias = new Map<
    string,
    {
      dia: number;
      diaSemana: string;
      faturamento: number;
      pecas: number;
      contratos: Set<number>;
      ehFimDeSemana: boolean;
      linhas: LinhaFatoBI[];
    }
  >();

  for (const row of linhas) {
    if (!row.data_entrega) continue;
    const dataStr = row.data_entrega;
    const diaNum = Number(dataStr.slice(8, 10));
    const ds = row.dia_semana_entrega || "";
    const ehFds =
      ds.toLowerCase().includes("sábado") ||
      ds.toLowerCase().includes("sabado") ||
      ds.toLowerCase().includes("domingo") ||
      ds.toLowerCase().includes("sexta");

    const atual = mapaDias.get(dataStr) ?? {
      dia: diaNum,
      diaSemana: ds.split("-")[0] || ds,
      faturamento: 0,
      pecas: 0,
      contratos: new Set<number>(),
      ehFimDeSemana: ehFds,
      linhas: [],
    };

    atual.faturamento += Number(row.valor_item) || 0;
    atual.pecas += Number(row.quantidade) || 0;
    atual.contratos.add(row.id_locacao);
    atual.linhas.push(row);
    mapaDias.set(dataStr, atual);
  }

  // Agrupamento de blocos de fim de semana (Sexta a Domingo)
  const mapaFinsDeSemana = agruparFinsDeSemana(mapaDias);

  let fimDeSemanaCampeao: FimDeSemanaCampeao | null = null;
  let maiorFaturamentoFds = 0;

  for (const fds of mapaFinsDeSemana.values()) {
    if (fds.faturamento > maiorFaturamentoFds) {
      maiorFaturamentoFds = fds.faturamento;
      fimDeSemanaCampeao = fds;
    }
  }

  const totalFaturamentoDiario = Array.from(mapaDias.values()).reduce(
    (acc, d) => acc + d.faturamento,
    0,
  );

  const evolucaoDiaria: PontoDiario[] = Array.from(mapaDias.entries())
    .map(([data, info]) => {
      const faturamentoDia = arredondarMoeda(info.faturamento);
      const contratosDia = info.contratos.size;
      const ticketMedioDia = contratosDia > 0 ? arredondarMoeda(faturamentoDia / contratosDia) : 0;
      const participacaoDia =
        totalFaturamentoDiario > 0
          ? Math.round((info.faturamento / totalFaturamentoDiario) * 1000) / 10
          : 0;

      let fimDeSemanaContexto: PontoDiario["detalhe"]["fimDeSemanaContexto"] = null;
      if (info.ehFimDeSemana) {
        const chave = obterChaveFimDeSemana(data).chaveFds;
        const fds = mapaFinsDeSemana.get(chave);
        if (fds && fds.faturamento > 0) {
          fimDeSemanaContexto = {
            rotulo: fds.rotulo,
            faturamentoFds: fds.faturamento,
            contratosFds: fds.contratos,
            percentualDoFds: Math.round((faturamentoDia / fds.faturamento) * 1000) / 10,
          };
        }
      }

      return {
        data,
        dia: info.dia,
        diaSemana: info.diaSemana,
        faturamento: faturamentoDia,
        volumeContratos: contratosDia,
        ehFimDeSemana: info.ehFimDeSemana,
        detalhe: {
          totalPecas: info.pecas,
          ticketMedio: ticketMedioDia,
          participacaoPercentual: participacaoDia,
          fimDeSemanaContexto,
          locacoes: agruparLocacoes(info.linhas),
        },
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  // 4. Agrupamento: Evolução Temporal Mensal (Janeiro a Dezembro) com detalhe por mês
  const NOMES_MESES_CURTOS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const NOMES_MESES_COMPLETOS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const mapaMeses = new Map<
    number,
    {
      rotulo: string;
      nomeCompleto: string;
      faturamento: number;
      pecas: number;
      contratos: Set<number>;
      linhas: LinhaFatoBI[];
    }
  >();

  for (let m = 1; m <= 12; m++) {
    mapaMeses.set(m, {
      rotulo: NOMES_MESES_CURTOS[m - 1],
      nomeCompleto: NOMES_MESES_COMPLETOS[m - 1],
      faturamento: 0,
      pecas: 0,
      contratos: new Set<number>(),
      linhas: [],
    });
  }

  for (const row of linhas) {
    const mes = row.mes_entrega;
    if (mes && mapaMeses.has(mes)) {
      const entry = mapaMeses.get(mes)!;
      entry.faturamento += Number(row.valor_item) || 0;
      entry.pecas += Number(row.quantidade) || 0;
      entry.contratos.add(row.id_locacao);
      entry.linhas.push(row);
    }
  }

  const totalFaturamentoAnual = Array.from(mapaMeses.values()).reduce(
    (acc, m) => acc + m.faturamento,
    0,
  );

  const evolucaoMensal: PontoEvolucaoMensal[] = Array.from(mapaMeses.entries()).map(
    ([mesNum, info]) => {
      const faturamentoMes = arredondarMoeda(info.faturamento);
      const qtdContratos = info.contratos.size;

      if (qtdContratos === 0 && faturamentoMes === 0) {
        return {
          mesNumero: mesNum,
          rotulo: info.rotulo,
          faturamento: 0,
          volumeContratos: 0,
          detalhe: null,
        };
      }

      const mesAnterior = mesNum > 1 ? mapaMeses.get(mesNum - 1) : undefined;
      const variacaoMesAnterior =
        mesAnterior && mesAnterior.faturamento > 0
          ? Math.round(((info.faturamento - mesAnterior.faturamento) / mesAnterior.faturamento) * 1000) / 10
          : null;

      const diasDoMes = evolucaoDiaria.filter((d) => Number(d.data.slice(5, 7)) === mesNum);
      let melhorDia: { data: string; diaSemana: string; faturamento: number } | null = null;
      for (const d of diasDoMes) {
        if (!melhorDia || d.faturamento > melhorDia.faturamento) {
          melhorDia = { data: d.data, diaSemana: d.diaSemana, faturamento: d.faturamento };
        }
      }

      const mapaDiasMes = new Map(
        Array.from(mapaDias.entries()).filter(([data]) => Number(data.slice(5, 7)) === mesNum),
      );
      const fdsMes = agruparFinsDeSemana(mapaDiasMes);
      let fdsCampeaoMes: FimDeSemanaCampeao | null = null;
      for (const fds of fdsMes.values()) {
        if (!fdsCampeaoMes || fds.faturamento > fdsCampeaoMes.faturamento) {
          fdsCampeaoMes = fds;
        }
      }

      return {
        mesNumero: mesNum,
        rotulo: info.rotulo,
        faturamento: faturamentoMes,
        volumeContratos: qtdContratos,
        detalhe: {
          nomeCompleto: info.nomeCompleto,
          totalPecas: info.pecas,
          ticketMedio: qtdContratos > 0 ? arredondarMoeda(faturamentoMes / qtdContratos) : 0,
          participacaoPercentual:
            totalFaturamentoAnual > 0
              ? Math.round((info.faturamento / totalFaturamentoAnual) * 1000) / 10
              : 0,
          variacaoMesAnterior,
          melhorDia,
          fimDeSemanaCampeao: fdsCampeaoMes,
          topCategorias: agruparCategorias(info.linhas).slice(0, 3),
          topItens: agruparTopItens(info.linhas, 5),
          perfisCliente: agruparTiposCliente(info.linhas),
          statusResumo: agruparStatus(info.linhas),
        },
      };
    },
  );

  // 5. Agrupamentos Gerais do Período
  const faturamentoPorCategoria = agruparCategorias(linhas);
  const faturamentoPorTipoCliente = agruparTiposCliente(linhas);
  const locacoesPorStatus = agruparStatus(linhas);
  const topItens = agruparTopItens(linhas, 10);

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

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function obterChaveFimDeSemana(dataStr: string) {
  const dt = new Date(dataStr + "T00:00:00");
  const diaDaSemana = dt.getDay(); // 0: Dom, 5: Sex, 6: Sáb
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

  return {
    chaveFds,
    rotulo,
    dataInicio: chaveFds,
    dataFim: domingo.toISOString().slice(0, 10),
  };
}

function agruparFinsDeSemana(
  mapaDias: Map<
    string,
    {
      dia: number;
      diaSemana: string;
      faturamento: number;
      pecas: number;
      contratos: Set<number>;
      ehFimDeSemana: boolean;
      linhas: LinhaFatoBI[];
    }
  >,
): Map<string, FimDeSemanaCampeao> {
  const acumulado = new Map<
    string,
    {
      rotulo: string;
      dataInicio: string;
      dataFim: string;
      faturamento: number;
      contratos: Set<number>;
      dias: { data: string; diaSemana: string; faturamento: number; contratos: number }[];
      linhas: LinhaFatoBI[];
    }
  >();

  for (const [data, info] of mapaDias.entries()) {
    if (!info.ehFimDeSemana) continue;
    const { chaveFds, rotulo, dataInicio, dataFim } = obterChaveFimDeSemana(data);
    const atual = acumulado.get(chaveFds) ?? {
      rotulo,
      dataInicio,
      dataFim,
      faturamento: 0,
      contratos: new Set<number>(),
      dias: [],
      linhas: [],
    };

    atual.faturamento += info.faturamento;
    info.contratos.forEach((id) => atual.contratos.add(id));
    atual.dias.push({
      data,
      diaSemana: info.diaSemana,
      faturamento: arredondarMoeda(info.faturamento),
      contratos: info.contratos.size,
    });
    atual.linhas.push(...info.linhas);
    acumulado.set(chaveFds, atual);
  }

  const resultado = new Map<string, FimDeSemanaCampeao>();
  for (const [chave, fds] of acumulado.entries()) {
    resultado.set(chave, {
      rotulo: fds.rotulo,
      dataInicio: fds.dataInicio,
      dataFim: fds.dataFim,
      faturamento: arredondarMoeda(fds.faturamento),
      contratos: fds.contratos.size,
      dias: [...fds.dias].sort((a, b) => a.data.localeCompare(b.data)),
      locacoes: agruparLocacoes(fds.linhas),
    });
  }

  return resultado;
}

function agruparLocacoes(linhas: LinhaFatoBI[]): ResumoLocacaoDia[] {
  const mapa = new Map<
    number,
    {
      idLocacao: number;
      clienteNome: string;
      tipoCliente: string;
      status: string;
      dataEntrega: string;
      dataRecolhimento: string | null;
      valorTotal: number;
      itens: Map<string, number>;
    }
  >();

  for (const row of linhas) {
    const atual = mapa.get(row.id_locacao) ?? {
      idLocacao: row.id_locacao,
      clienteNome: row.cliente_nome || "Cliente",
      tipoCliente: row.tipo_cliente || "Outro",
      status: row.status || "Indefinido",
      dataEntrega: row.data_entrega || "",
      dataRecolhimento: row.data_recolhimento,
      valorTotal: 0,
      itens: new Map<string, number>(),
    };

    atual.valorTotal += Number(row.valor_item) || 0;
    const nomeItem = row.nome_item || `Item #${row.id_item}`;
    atual.itens.set(nomeItem, (atual.itens.get(nomeItem) ?? 0) + (Number(row.quantidade) || 0));
    mapa.set(row.id_locacao, atual);
  }

  return Array.from(mapa.values())
    .map((loc) => ({
      idLocacao: loc.idLocacao,
      clienteNome: loc.clienteNome,
      tipoCliente: loc.tipoCliente,
      status: loc.status,
      dataEntrega: loc.dataEntrega,
      dataRecolhimento: loc.dataRecolhimento,
      valorTotal: arredondarMoeda(loc.valorTotal),
      itensResumo: Array.from(loc.itens.entries()).map(([nome, quantidade]) => ({
        nome,
        quantidade,
      })),
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

function agruparCategorias(linhas: LinhaFatoBI[]): PontoCategoria[] {
  const mapa = new Map<string, { id: number; faturamento: number; quantidade: number }>();
  for (const row of linhas) {
    const catNome = row.nome_categoria || "Sem categoria";
    const atual = mapa.get(catNome) ?? {
      id: row.id_categoria || 0,
      faturamento: 0,
      quantidade: 0,
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.quantidade += Number(row.quantidade) || 0;
    mapa.set(catNome, atual);
  }

  return Array.from(mapa.entries())
    .map(([categoria, info]) => ({
      id: info.id,
      categoria,
      faturamento: arredondarMoeda(info.faturamento),
      quantidade: info.quantidade,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

function agruparTiposCliente(linhas: LinhaFatoBI[]): PontoTipoCliente[] {
  const mapa = new Map<string, { id: number; faturamento: number; contratos: Set<number> }>();
  for (const row of linhas) {
    const tipo = row.tipo_cliente || "Outro";
    const atual = mapa.get(tipo) ?? {
      id: row.id_tipo_cliente || 0,
      faturamento: 0,
      contratos: new Set<number>(),
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.contratos.add(row.id_locacao);
    mapa.set(tipo, atual);
  }

  return Array.from(mapa.entries())
    .map(([tipo, info]) => ({
      id: info.id,
      tipo,
      faturamento: arredondarMoeda(info.faturamento),
      contratos: info.contratos.size,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

function agruparStatus(linhas: LinhaFatoBI[]): PontoStatus[] {
  const mapa = new Map<string, { id: number; faturamento: number; contratos: Set<number> }>();
  for (const row of linhas) {
    const st = row.status || "Indefinido";
    const atual = mapa.get(st) ?? {
      id: row.id_status || 0,
      faturamento: 0,
      contratos: new Set<number>(),
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.contratos.add(row.id_locacao);
    mapa.set(st, atual);
  }

  const totalLocacoesStatus = Array.from(mapa.values()).reduce(
    (acc, curr) => acc + curr.contratos.size,
    0,
  );

  return Array.from(mapa.entries())
    .map(([status, info]) => {
      const qtd = info.contratos.size;
      const pct = totalLocacoesStatus > 0 ? (qtd / totalLocacoesStatus) * 100 : 0;
      return {
        id: info.id,
        status,
        faturamento: arredondarMoeda(info.faturamento),
        quantidade: qtd,
        percentual: Math.round(pct * 10) / 10,
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);
}

function agruparTopItens(linhas: LinhaFatoBI[], limite?: number): PontoItemRanking[] {
  const mapa = new Map<
    number,
    { nome: string; categoria: string; faturamento: number; quantidadeTotal: number }
  >();

  for (const row of linhas) {
    const idItem = row.id_item;
    const atual = mapa.get(idItem) ?? {
      nome: row.nome_item || `Item #${idItem}`,
      categoria: row.nome_categoria || "Sem categoria",
      faturamento: 0,
      quantidadeTotal: 0,
    };
    atual.faturamento += Number(row.valor_item) || 0;
    atual.quantidadeTotal += Number(row.quantidade) || 0;
    mapa.set(idItem, atual);
  }

  const lista = Array.from(mapa.entries())
    .map(([id, info]) => ({
      id,
      nome: info.nome,
      categoria: info.categoria,
      faturamento: arredondarMoeda(info.faturamento),
      quantidadeTotal: info.quantidadeTotal,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  return typeof limite === "number" ? lista.slice(0, limite) : lista;
}

// Tipos TypeScript para o Modelo Dimensional (Star Schema) e Dashboard BI

export interface DimTipoCliente {
  id_tipo_cliente: number;
  descricao: string;
}

export interface DimCategoriaItem {
  id_categoria: number;
  nome_categoria: string;
}

export interface DimStatusLocacao {
  id_status: number;
  descricao_status: string;
}

export interface DimDataCalendario {
  id_data: number; // YYYYMMDD
  data_completa: string; // YYYY-MM-DD
  ano: number;
  mes: number;
  nome_mes: string;
  dia_mes: number;
  dia_semana: string;
  trimestre: number;
  semana_ano: number;
}

export interface DimCliente {
  id_cliente: number;
  nome: string;
  telefone: string | null;
  id_tipo_cliente: number;
}

export interface DimItem {
  id_item: number;
  nome_item: string;
  quantidade_total: number;
  preco_base_diaria: number;
  custo_aquisicao: number;
  id_categoria: number;
}

export interface FatoLocacao {
  id: number;
  id_locacao: number;
  id_cliente: number;
  id_data_cadastro: number;
  id_data_entrega: number;
  id_data_recolhimento: number;
  id_status: number;
  id_item: number;
  quantidade: number;
  preco_diaria: number;
  valor_item: number;
}

// Parâmetros de Filtros do BI (recebidos via URL / searchParams)
export interface FiltrosBI {
  ano?: string;
  mes?: string;
  trimestre?: string;
  de?: string; // Data YYYY-MM-DD
  ate?: string; // Data YYYY-MM-DD
  categoria_id?: string;
  tipo_cliente_id?: string;
  status_id?: string;
}

// KPIs Agregados do BI
export interface KpisBI {
  faturamentoTotal: number;
  totalContratos: number;
  totalPecasAlugadas: number;
  ticketMedio: number;
  precoMedioDiaria: number;
}

// Séries e Gráficos do BI
export interface PontoEvolucaoMensal {
  mesNumero: number;
  rotulo: string; // Ex: 'Jan/2026'
  faturamento: number;
  volumeContratos: number;
}

export interface PontoCategoria {
  id: number;
  categoria: string;
  faturamento: number;
  quantidade: number;
}

export interface PontoTipoCliente {
  id: number;
  tipo: string;
  faturamento: number;
  contratos: number;
}

export interface PontoStatus {
  id: number;
  status: string;
  faturamento: number;
  quantidade: number;
}

export interface PontoItemRanking {
  id: number;
  nome: string;
  categoria: string;
  faturamento: number;
  quantidadeTotal: number;
}

export interface DadosDashboardBI {
  kpis: KpisBI;
  evolucaoMensal: PontoEvolucaoMensal[];
  faturamentoPorCategoria: PontoCategoria[];
  faturamentoPorTipoCliente: PontoTipoCliente[];
  locacoesPorStatus: PontoStatus[];
  topItens: PontoItemRanking[];
  opcoesFiltros: {
    anos: number[];
    categorias: DimCategoriaItem[];
    tiposCliente: DimTipoCliente[];
    statusList: DimStatusLocacao[];
  };
}

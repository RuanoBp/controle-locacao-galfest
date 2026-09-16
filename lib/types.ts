export type StatusLocacao =
  | "Orçamento"
  | "Confirmada"
  | "Entregue"
  | "Recolhida"
  | "Atrasada"
  | "Cancelada";

export const STATUS_LOCACAO: StatusLocacao[] = [
  "Orçamento",
  "Confirmada",
  "Entregue",
  "Recolhida",
  "Atrasada",
  "Cancelada",
];

export const TIPOS_CLIENTE = [
  "Pessoa Física",
  "Pessoa Jurídica",
  "Cerimonialista",
  "Buffet",
  "Casa de Festas",
  "Outro",
] as const;

export interface Item {
  id: number;
  nome: string;
  categoria: string;
  estoque_total: number;
  preco_diaria: number;
  custo_aquisicao: number;
  created_at: string;
  updated_at: string;
}

export interface ItemComEstoque extends Item {
  comprometido_hoje: number;
  disponivel_hoje: number;
}

export interface Cliente {
  id: number;
  nome: string;
  tipo: string;
  cidade_bairro: string | null;
  telefone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Locacao {
  id: number;
  cliente_id: number;
  data: string;
  data_entrega: string;
  data_recolher: string;
  status: StatusLocacao;
  valor_frete: number;
  created_at: string;
  updated_at: string;
}

export interface ItemAlugado {
  id: number;
  locacao_id: number;
  item_id: number;
  quantidade: number;
  preco_diaria: number;
  created_at: string;
}

export interface ItemMaisAlugado {
  id: number;
  nome: string;
  categoria: string;
  estoque_total: number;
  total_alugado: number;
  taxa_utilizacao: number;
}

export interface LocacaoComRelacoes extends Locacao {
  cliente: Cliente;
  itens_alugados: (ItemAlugado & { item: Item })[];
  valor_total?: number;
}

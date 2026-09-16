import { z } from "zod";

export const itemSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item"),
  categoria: z.string().trim().min(1, "Informe a categoria"),
  estoque_total: z.coerce
    .number("Informe um número válido")
    .int("Estoque deve ser um número inteiro")
    .min(0, "Estoque não pode ser negativo"),
  preco_diaria: z.coerce
    .number("Informe um número válido")
    .min(0, "Preço não pode ser negativo"),
  custo_aquisicao: z.coerce
    .number("Informe um número válido")
    .min(0, "Custo não pode ser negativo")
    .default(0),
});

export type ItemInput = z.infer<typeof itemSchema>;

// Usado na importação por planilha: mesmas regras, mas a partir de texto livre
export const itemImportSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  categoria: z.string().trim().min(1, "Categoria é obrigatória"),
  estoque_total: z.coerce
    .number("Estoque Total deve ser um número")
    .int("Estoque Total deve ser inteiro")
    .min(0, "Estoque Total não pode ser negativo"),
  preco_diaria: z.coerce
    .number("Preço Diária deve ser um número")
    .min(0, "Preço Diária não pode ser negativo"),
  custo_aquisicao: z.coerce
    .number("Custo de Aquisição deve ser um número")
    .min(0, "Custo de Aquisição não pode ser negativo")
    .default(0),
});

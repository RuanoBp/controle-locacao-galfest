import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do cliente"),
  tipo: z.string().trim().min(1, "Informe o tipo de cliente"),
  cidade_bairro: z.string().trim().optional().default(""),
  telefone: z.string().trim().optional().default(""),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export const clienteImportSchema = z.object({
  nome: z.string().trim().min(1, "Nome Cliente é obrigatório"),
  tipo: z.string().trim().min(1, "Tipo Cliente é obrigatório"),
  cidade_bairro: z.string().trim().optional().default(""),
  telefone: z.string().trim().optional().default(""),
});

import { z } from "zod";
import { STATUS_LOCACAO } from "@/lib/types";

export const itemAlugadoSchema = z.object({
  item_id: z.coerce.number("Selecione um item").int().positive("Selecione um item"),
  quantidade: z.coerce
    .number("Informe a quantidade")
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
});

export const locacaoSchema = z
  .object({
    cliente_id: z.coerce.number("Selecione um cliente").int().positive("Selecione um cliente"),
    data: z.string().min(1, "Informe a data"),
    data_entrega: z.string().min(1, "Informe a data de entrega"),
    data_recolher: z.string().min(1, "Informe a data de recolhimento"),
    status: z.enum(STATUS_LOCACAO),
    valor_frete: z.coerce.number("Informe um número válido").min(0, "Frete não pode ser negativo").default(0),
    itens: z
      .array(itemAlugadoSchema)
      .min(1, "Adicione pelo menos um item à locação"),
  })
  .refine((data) => data.data_recolher >= data.data_entrega, {
    message: "A data de recolhimento não pode ser anterior à data de entrega",
    path: ["data_recolher"],
  });

export type LocacaoInput = z.infer<typeof locacaoSchema>;

// Formato de importação: uma linha por locação, itens descritos como
// "Nome do Item:quantidade" separados por ponto e vírgula, ex:
// "Mesa redonda:10;Cadeira tiffany:50"
export const locacaoImportSchema = z.object({
  cliente: z.string().trim().min(1, "Cliente é obrigatório (nome exato já cadastrado)"),
  data: z.string().trim().min(1, "Data é obrigatória"),
  data_entrega: z.string().trim().min(1, "Data para Entrega é obrigatória"),
  data_recolher: z.string().trim().min(1, "Data para Recolher é obrigatória"),
  status: z.string().trim().min(1, "Status é obrigatório"),
  valor_frete: z.coerce.number("Valor Frete deve ser um número").min(0).default(0),
  itens: z.string().trim().min(1, "Informe ao menos um item no formato Nome:Quantidade"),
});

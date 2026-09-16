// Gera as planilhas-modelo em public/modelos/ para download na tela de importação.
// Rode com: node scripts/gerar-modelos.mjs
import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(__dirname, "..", "public", "modelos");

async function criarPlanilha(nomeArquivo, colunas, linhasExemplo) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dados");

  sheet.columns = colunas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const linha of linhasExemplo) {
    sheet.addRow(linha);
  }

  await mkdir(destino, { recursive: true });
  await workbook.xlsx.writeFile(path.join(destino, nomeArquivo));
  console.log(`Gerado: ${nomeArquivo}`);
}

await criarPlanilha(
  "modelo-itens.xlsx",
  [
    { header: "Nome", key: "nome" },
    { header: "Categoria", key: "categoria" },
    { header: "Estoque Total", key: "estoque_total", width: 16 },
    { header: "Preço Diária", key: "preco_diaria", width: 16 },
    { header: "Custo de Aquisição", key: "custo_aquisicao", width: 18 },
  ],
  [
    {
      nome: "Mesa redonda 8 lugares",
      categoria: "Mobiliário",
      estoque_total: 20,
      preco_diaria: 25,
      custo_aquisicao: 350,
    },
    {
      nome: "Cadeira tiffany",
      categoria: "Mobiliário",
      estoque_total: 200,
      preco_diaria: 4,
      custo_aquisicao: 45,
    },
  ],
);

await criarPlanilha(
  "modelo-clientes.xlsx",
  [
    { header: "Nome Cliente", key: "nome" },
    { header: "Tipo Cliente", key: "tipo", width: 18 },
    { header: "Cidade ou Bairro", key: "cidade_bairro" },
    { header: "Telefone", key: "telefone" },
  ],
  [
    {
      nome: "Buffet Sabor & Arte",
      tipo: "Buffet",
      cidade_bairro: "Centro",
      telefone: "(11) 91234-5678",
    },
    {
      nome: "Maria Silva",
      tipo: "Pessoa Física",
      cidade_bairro: "Jardim das Flores",
      telefone: "(11) 98888-1234",
    },
  ],
);

await criarPlanilha(
  "modelo-locacoes.xlsx",
  [
    { header: "Cliente", key: "cliente" },
    { header: "Data", key: "data", width: 14 },
    { header: "Data para Entrega", key: "data_entrega", width: 18 },
    { header: "Data para Recolher", key: "data_recolher", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Valor Frete", key: "valor_frete", width: 14 },
    { header: "Itens", key: "itens", width: 40 },
  ],
  [
    {
      cliente: "Buffet Sabor & Arte",
      data: "2026-01-10",
      data_entrega: "2026-01-15",
      data_recolher: "2026-01-16",
      status: "Confirmada",
      valor_frete: 80,
      itens: "Mesa redonda 8 lugares:10;Cadeira tiffany:80",
    },
  ],
);

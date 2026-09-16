import ExcelJS from "exceljs";
import Papa from "papaparse";

export type LinhaPlanilha = Record<string, string>;

function normalizarCabecalho(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Lê um arquivo .xlsx (primeira planilha) e retorna linhas como objetos {cabeçalho: valor}. */
async function parseXlsx(file: File): Promise<LinhaPlanilha[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- desalinho de tipos entre @types/node e exceljs
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const linhas: LinhaPlanilha[] = [];
  let cabecalhos: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    const valores = (row.values as ExcelJS.CellValue[]).slice(1); // índice 0 é vazio

    if (rowNumber === 1) {
      cabecalhos = valores.map((v) => String(v ?? "").trim());
      return;
    }

    const linha: LinhaPlanilha = {};
    let temValor = false;
    cabecalhos.forEach((cabecalho, i) => {
      const valor = valores[i];
      const texto =
        valor instanceof Date
          ? valor.toISOString().slice(0, 10)
          : String(valor ?? "").trim();
      if (texto) temValor = true;
      linha[cabecalho] = texto;
    });

    if (temValor) linhas.push(linha);
  });

  return linhas;
}

function parseCsv(texto: string): LinhaPlanilha[] {
  const resultado = Papa.parse<LinhaPlanilha>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return resultado.data;
}

/** Lê .xlsx ou .csv e devolve as linhas com as chaves exatamente como no cabeçalho da planilha. */
export async function lerPlanilha(file: File): Promise<LinhaPlanilha[]> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".csv")) {
    const texto = await file.text();
    return parseCsv(texto);
  }
  return parseXlsx(file);
}

/**
 * Aceita datas em ISO (aaaa-mm-dd) ou formato brasileiro (dd/mm/aaaa) e
 * devolve sempre em ISO. Retorna null se não conseguir reconhecer o formato.
 */
export function normalizarData(valor: string): string | null {
  const texto = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const brasileiro = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brasileiro) {
    const [, dia, mes, ano] = brasileiro;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Reconstrói um objeto usando um mapa {chaveInterna: possíveisCabeçalhos[]},
 * comparando os cabeçalhos da planilha sem acentos/maiúsculas.
 */
export function mapearLinha<T extends string>(
  linha: LinhaPlanilha,
  mapa: Record<T, readonly string[]>,
): Record<T, string> {
  const linhaNormalizada = new Map(
    Object.entries(linha).map(([k, v]) => [normalizarCabecalho(k), v]),
  );

  const resultado = {} as Record<T, string>;
  for (const chave of Object.keys(mapa) as T[]) {
    const candidatos = mapa[chave];
    const encontrado = candidatos
      .map((c) => linhaNormalizada.get(normalizarCabecalho(c)))
      .find((v) => v !== undefined);
    resultado[chave] = encontrado ?? "";
  }
  return resultado;
}

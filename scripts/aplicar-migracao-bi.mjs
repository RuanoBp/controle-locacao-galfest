// Script para ler a migração do BI e exibir instruções
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "0002_bi_star_schema.sql");

if (!existsSync(migrationPath)) {
  console.error("Arquivo de migração não encontrado:", migrationPath);
  process.exit(1);
}

console.log("=================================================================");
console.log("  MIGRAÇÃO BI STAR SCHEMA: 0002_bi_star_schema.sql");
console.log("=================================================================");
console.log("\nPara aplicar no Supabase:");
console.log("1. Acesse https://supabase.com/dashboard");
console.log("2. Selecione seu projeto Galfest");
console.log("3. Vá em 'SQL Editor' no menu lateral esquerdo");
console.log("4. Clique em 'New query'");
console.log("5. Cole o conteúdo de: supabase/migrations/0002_bi_star_schema.sql");
console.log("6. Clique no botão verde 'Run' no canto inferior direito.");
console.log("\nPronto! As tabelas de dimensão, calendário e a fato_locacao serão criadas instantaneamente.\n");

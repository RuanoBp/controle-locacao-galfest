// Cria (ou atualiza a senha d)o único usuário administrador do sistema.
// Não existe cadastro público — este script é a única forma de criar/trocar
// o login, usando a Service Role Key do Supabase (nunca exposta no site).
//
// Uso:
//   1. No .env.local, preencha SUPABASE_SERVICE_ROLE_KEY (Dashboard do
//      Supabase > Project Settings > API > service_role).
//   2. Rode: node scripts/criar-admin.mjs seu-email@exemplo.com "SuaSenhaForte123"
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const [, , email, senha] = process.argv;

if (!email || !senha) {
  console.error('Uso: node scripts/criar-admin.mjs "email@exemplo.com" "SenhaForte123"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local antes de rodar este script.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existentes, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Erro ao consultar usuários:", listError.message);
  process.exit(1);
}

const usuarioExistente = existentes.users.find((u) => u.email === email);

if (usuarioExistente) {
  const { error } = await supabase.auth.admin.updateUserById(usuarioExistente.id, {
    password: senha,
  });
  if (error) {
    console.error("Erro ao atualizar senha:", error.message);
    process.exit(1);
  }
  console.log(`Senha atualizada para o usuário ${email}.`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) {
    console.error("Erro ao criar usuário:", error.message);
    process.exit(1);
  }
  console.log(`Usuário administrador ${email} criado com sucesso.`);
}

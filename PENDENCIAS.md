# Pendências para colocar o sistema no ar

O código do sistema já está pronto (CRUD de itens/clientes/locações,
importação de planilha, dashboard, login). O que falta é só **conectar as
contas externas** (Supabase, GitHub, Vercel) e criar o usuário de login de
verdade. Nada disso exige mexer no código — são só passos de configuração.

Veja também o [README.md](README.md), que explica cada uma dessas partes
com mais detalhe. Este arquivo é só o checklist do que ainda falta fazer.

## Credenciais de login já decididas

- **Login desejado:** `ADMGalfest`
- **Senha desejada:** `Galfest123`

⚠️ **Atenção:** o sistema usa o Supabase Auth para login, e o Supabase exige
um **e-mail** como identificador — não aceita um nome de usuário simples
como `ADMGalfest`. Ou seja, `ADMGalfest` sozinho não funciona como login.

Duas opções para resolver isso (escolha uma antes de criar o usuário no
passo 4 abaixo):

1. **Criar um e-mail fictício** só para servir de login, por exemplo
   `admgalfest@galfest.local` ou `admgalfest@seudominio.com.br`. Ele não
   precisa existir de verdade nem receber e-mails — serve só como
   identificador, porque o usuário é criado direto por um script
   administrativo (sem enviar e-mail de confirmação).
2. **Usar um e-mail de verdade** (ex: o e-mail do seu amigo/da empresa).
   Vantagem: se um dia esquecer a senha, dá pra redefinir pelo painel do
   Supabase vendo esse e-mail.

Qualquer uma das duas funciona igual no dia a dia: na tela de login, o
campo "E-mail" recebe o e-mail escolhido, e o campo "Senha" recebe
`Galfest123`.

## Checklist do que falta

- [ ] **1. Criar conta no GitHub** (se ainda não tiver) e criar um
      repositório **privado** (ex: `controle-locacao-galfest`).
- [ ] **2. Subir o código para esse repositório** (`git remote add origin ...`
      e `git push -u origin main` — o projeto já está commitado localmente).
- [ ] **3. Criar conta no [supabase.com](https://supabase.com)** e um novo
      projeto (gratuito).
  - No **SQL Editor** do painel, rodar o conteúdo do arquivo
    [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
    (cria as tabelas, views e regras de segurança).
  - Em **Authentication > Providers**, deixar só **Email** ativo e
    **desativar "Allow new users to sign up"** (não pode ter cadastro
    público).
  - Em **Project Settings > API**, copiar a `Project URL`, a chave `anon` /
    `publishable` e a chave `service_role` (essa última é secreta).
- [ ] **4. Criar o usuário de login**, localmente, depois de preencher o
      `.env.local` (copiar de `.env.example` e colar os valores do passo 3):
  ```bash
  npm install
  npm run criar-admin -- "admgalfest@galfest.local" "Galfest123"
  ```
  (troque o e-mail pelo escolhido na seção acima). Esse mesmo comando serve
  para trocar a senha depois, se precisar — é só rodar de novo.
- [ ] **5. Criar conta na [vercel.com](https://vercel.com)** e importar o
      repositório do GitHub.
  - Em **Settings > Environment Variables**, cadastrar como secrets:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - (não precisa colocar a `service_role` na Vercel — ela só é usada
      localmente, no passo 4)
  - Fazer o deploy.
- [ ] **6. Testar o login** na URL pública da Vercel com o e-mail escolhido
      e a senha `Galfest123`.
- [ ] **7. (Opcional) Cadastrar os primeiros itens e clientes**, ou importar
      via planilha em **Importar** (modelos de planilha disponíveis dentro
      do próprio sistema, na aba Importar).

## Se algo der errado

- **Build falhando:** rodar `npm run build` localmente mostra o erro exato.
- **Login não funciona:** confirmar que rodou `npm run criar-admin` com o
  e-mail certo, e que as variáveis de ambiente na Vercel são exatamente as
  mesmas do `.env.local` local (mesma URL/chaves do mesmo projeto Supabase).
- **Erro de permissão/RLS ao salvar dados:** confirmar que a migration do
  passo 3 rodou inteira, sem erro, no SQL Editor do Supabase.

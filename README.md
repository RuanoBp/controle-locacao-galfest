# Controle de Locação de Utensílios para Eventos

Sistema web privado para controlar estoque e locações de uma empresa de
locação de utensílios para eventos: itens, clientes, locações (com os itens
alugados em cada uma), importação em massa por planilha e um dashboard com
indicadores.

Acesso restrito por login — não há cadastro público de usuários.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** — Postgres gerenciado, usado como banco de dados **e** como
  provedor de autenticação (via API/SDK, sem precisar instalar nada
  localmente)
- **Tailwind CSS** para a interface
- **exceljs** / **papaparse** para importar planilhas `.xlsx` / `.csv`
- Deploy sugerido: **Vercel**

## Como o acesso é protegido

- Não existe tela de cadastro. O único usuário é criado manualmente (veja
  abaixo).
- Todas as rotas do sistema (tudo exceto `/login`) exigem sessão válida —
  isso é verificado em duas camadas: no `proxy.ts` (bloqueia a navegação) e
  de novo dentro de cada Server Action/página (`lib/auth.ts`), já que ações
  do servidor podem ser chamadas diretamente.
- No banco, cada tabela tem **Row Level Security** habilitada: só o papel
  `authenticated` (ou seja, quem fez login) consegue ler ou escrever dados.
  Isso garante que, mesmo que a URL do site fique pública na internet
  (é normal em serviços como a Vercel), ninguém sem a senha consegue ver ou
  alterar informações.

---

## 1. Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo
   projeto.
2. No **SQL Editor** do painel, cole o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e
   execute. Isso cria as 4 tabelas (`itens`, `clientes`, `locacoes`,
   `itens_alugados`), as views/funções auxiliares e as políticas de RLS.
3. Em **Authentication > Providers**, deixe apenas **Email** habilitado e
   **desative "Allow new users to sign up"** (não deve haver cadastro
   público).
4. Em **Project Settings > API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secreta — **nunca**
     coloque no código ou no navegador; é usada só pelo script de criação de
     usuário, rodado localmente)

## 2. Rodar localmente

```bash
npm install
cp .env.example .env.local   # depois preencha com os valores do Supabase
npm run dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`.

### Criar o usuário administrador

Não existe tela de cadastro por design. Para criar (ou trocar a senha de) o
único login do sistema, rode localmente, com `.env.local` já preenchido:

```bash
npm run criar-admin -- "seu-email@exemplo.com" "SuaSenhaForte123"
```

- Se o e-mail ainda não existe, cria o usuário.
- Se já existe, **atualiza a senha** desse usuário — é assim que você troca
  a senha de acesso sempre que quiser, sem precisar mexer no código.

## 3. Deploy (Vercel)

1. Suba este repositório para o GitHub como **privado**.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Settings > Environment Variables**, cadastre como *secrets*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (não é necessário colocar a `SUPABASE_SERVICE_ROLE_KEY` na Vercel — ela
     só é usada localmente, pelo script de criação de usuário)
4. Deploy. A URL pública exigirá login antes de mostrar qualquer dado (ver
   seção "Como o acesso é protegido" acima).

## Planilhas para importação

Em **Importar** (menu do sistema) há um modelo `.xlsx` para download em cada
aba (Itens, Clientes, Locações), já com as colunas certas e um exemplo
preenchido. Os modelos ficam em `public/modelos/` e podem ser regenerados
com:

```bash
npm run gerar-modelos
```

Na planilha de **Locações**, a coluna `Itens` usa o formato
`Nome do Item:Quantidade`, separando vários itens por `;` — por exemplo:
`Mesa redonda 8 lugares:10;Cadeira tiffany:80`. Clientes e itens citados
precisam já estar cadastrados antes da importação.

## Estrutura do projeto

```
app/
  (auth)/login/        tela de login
  (dashboard)/         tudo que exige login (dashboard, itens, clientes, locações, importar)
components/            componentes de UI reutilizáveis
lib/
  supabase/            clientes Supabase (server components, server actions, proxy)
  validators/          validação (zod) de cada entidade
  import/              leitura de planilhas (.xlsx/.csv) e mapeamento de colunas
  calculos.ts          valor total de locação, número de diárias, formatação
  auth.ts              checagem de sessão usada em toda página/ação protegida
supabase/migrations/   schema SQL (tabelas, views, RLS)
scripts/                gerar-modelos.mjs (planilhas modelo) e criar-admin.mjs (login)
public/modelos/         planilhas-modelo para download
proxy.ts               bloqueia rotas sem sessão (substitui o antigo middleware.ts no Next 16)
```

## Regras de negócio implementadas

- **Estoque disponível**: calculado, nunca armazenado. A listagem de itens
  mostra o disponível "hoje"; ao montar uma locação, a disponibilidade é
  recalculada para o período exato de entrega/recolhimento escolhido
  (função SQL `estoque_comprometido`), considerando a sobreposição com
  outras locações não canceladas/recolhidas.
- **Valor total da locação** = soma(quantidade × preço diária × nº de
  diárias) de cada item + valor do frete. O preço da diária é "congelado"
  em `itens_alugados` no momento da locação, então alterar o preço de um
  item depois não muda locações já fechadas.
- **Locação atrasada**: calculada dinamicamente (data de recolhimento já
  passou e status ainda não é "Recolhida"/"Cancelada"), não depende de
  alguém lembrar de mudar o status manualmente.

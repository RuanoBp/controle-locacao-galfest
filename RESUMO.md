# Resumo — o que foi feito

Sistema de controle de locação de utensílios para eventos, no ar e testado.

## Está tudo pronto e funcionando

- **Site:** https://controle-locacao-galfest.vercel.app
- **Login:** `admgalfest@galfest.local`
- **Senha:** `Galfest123`

## O que foi feito

1. Sistema desenvolvido do zero: cadastro de itens, clientes e locações (com
   os itens de cada locação), importação de planilha, dashboard com
   indicadores e controle de estoque por período.
2. Código publicado em `github.com/RuanoBp/controle-locacao-galfest`.
3. Banco de dados criado no Supabase (tabelas, regras de segurança e
   usuário de login).
4. Site publicado na Vercel, ligado ao repositório do GitHub.
5. **Testado de ponta a ponta**: login real no site + upload de uma
   planilha de exemplo pela tela de Importar — os itens apareceram
   corretamente na listagem. Os dados de teste foram removidos depois,
   deixando o sistema limpo para o uso de verdade.

## Próximos passos (uso normal, não é obrigatório)

- Trocar a senha quando quiser: `npm run criar-admin -- "email" "nova-senha"`
  (rodando localmente, com o `.env.local` configurado).
- Cadastrar os itens e clientes reais — pela tela do sistema ou importando
  uma planilha (tem um modelo pra baixar em **Importar**).

Detalhes técnicos completos estão no [README.md](README.md).

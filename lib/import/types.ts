export interface ErroImportacao {
  linha: number;
  mensagem: string;
}

export interface ImportResultado {
  totalLinhas: number;
  sucesso: number;
  erros: ErroImportacao[];
}

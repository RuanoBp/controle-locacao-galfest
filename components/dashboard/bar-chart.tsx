const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];

interface Barra {
  rotulo: string;
  valor: number;
  cor?: string;
}

/**
 * Barra horizontal simples em SVG/HTML puro (sem libs), seguindo a paleta
 * categórica validada (contraste + daltonismo) e com rótulos diretos de
 * valor, já que 3 das 6 cores ficam abaixo de 3:1 de contraste sozinhas.
 */
export function BarChart({
  dados,
  corUnica,
}: {
  dados: Barra[];
  /** Quando definido, usa uma única cor para todas as barras (série única). */
  corUnica?: string;
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="space-y-2.5">
      {dados.map((barra, i) => {
        const cor = corUnica ?? barra.cor ?? CATEGORICAL[i % CATEGORICAL.length];
        const largura = Math.max(2, (barra.valor / max) * 100);
        return (
          <div key={barra.rotulo} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate text-slate-600" title={barra.rotulo}>
              {barra.rotulo}
            </span>
            <div className="h-4 flex-1 rounded-full bg-slate-100">
              <div
                className="h-4 rounded-full transition-[width]"
                style={{ width: `${largura}%`, backgroundColor: cor }}
                title={`${barra.rotulo}: ${barra.valor}`}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-medium tabular-nums text-slate-900">
              {barra.valor}
            </span>
          </div>
        );
      })}
      {dados.length === 0 && (
        <p className="text-sm text-slate-400">Sem dados para mostrar ainda.</p>
      )}
    </div>
  );
}

export { CATEGORICAL };

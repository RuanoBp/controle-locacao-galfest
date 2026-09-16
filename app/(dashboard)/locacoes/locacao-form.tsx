"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/field";
import { formatarMoeda, valorTotalLocacao } from "@/lib/calculos";
import { STATUS_LOCACAO, type Cliente, type Item, type LocacaoComRelacoes } from "@/lib/types";
import {
  verificarDisponibilidade,
  type DisponibilidadeResultado,
  type LocacaoFormState,
} from "./actions";

type LocacaoAction = (
  prevState: LocacaoFormState,
  formData: FormData,
) => Promise<LocacaoFormState>;

interface LinhaItem {
  key: string;
  item_id: number | "";
  quantidade: number;
}

function novaLinha(): LinhaItem {
  return { key: crypto.randomUUID(), item_id: "", quantidade: 1 };
}

export function LocacaoForm({
  clientes,
  itens,
  locacao,
  action,
}: {
  clientes: Cliente[];
  itens: Item[];
  locacao?: LocacaoComRelacoes;
  action: LocacaoAction;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  const [dataEntrega, setDataEntrega] = useState(locacao?.data_entrega ?? "");
  const [dataRecolher, setDataRecolher] = useState(locacao?.data_recolher ?? "");
  const [valorFrete, setValorFrete] = useState(locacao?.valor_frete ?? 0);
  const [linhas, setLinhas] = useState<LinhaItem[]>(() => {
    if (locacao?.itens_alugados?.length) {
      return locacao.itens_alugados.map((ia) => ({
        key: crypto.randomUUID(),
        item_id: ia.item_id,
        quantidade: ia.quantidade,
      }));
    }
    return [novaLinha()];
  });

  const [disponibilidade, setDisponibilidade] = useState<
    DisponibilidadeResultado[] | null
  >(null);
  const [verificando, startVerificacao] = useTransition();

  const itensPorId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  const valorTotal = useMemo(() => {
    const itensValidos = linhas
      .filter((l): l is LinhaItem & { item_id: number } => l.item_id !== "")
      .map((l) => ({
        quantidade: l.quantidade,
        preco_diaria: itensPorId.get(l.item_id)?.preco_diaria ?? 0,
      }));

    if (!dataEntrega || !dataRecolher) return 0;

    return valorTotalLocacao({
      itens: itensValidos,
      data_entrega: dataEntrega,
      data_recolher: dataRecolher,
      valor_frete: Number(valorFrete) || 0,
    });
  }, [linhas, dataEntrega, dataRecolher, valorFrete, itensPorId]);

  function atualizarLinha(key: string, campo: keyof LinhaItem, valor: string) {
    setLinhas((atual) =>
      atual.map((linha) =>
        linha.key === key
          ? {
              ...linha,
              [campo]: campo === "quantidade" ? Number(valor) : Number(valor) || "",
            }
          : linha,
      ),
    );
    setDisponibilidade(null);
  }

  function removerLinha(key: string) {
    setLinhas((atual) => atual.filter((linha) => linha.key !== key));
    setDisponibilidade(null);
  }

  function checarDisponibilidade() {
    const itensValidos = linhas
      .filter((l): l is LinhaItem & { item_id: number } => l.item_id !== "")
      .map((l) => ({ item_id: l.item_id, quantidade: l.quantidade }));

    if (itensValidos.length === 0 || !dataEntrega || !dataRecolher) {
      setDisponibilidade([]);
      return;
    }

    startVerificacao(async () => {
      const resultado = await verificarDisponibilidade(
        itensValidos,
        dataEntrega,
        dataRecolher,
        locacao?.id,
      );
      setDisponibilidade(resultado);
    });
  }

  const itensJson = JSON.stringify(
    linhas
      .filter((l) => l.item_id !== "")
      .map((l) => ({ item_id: l.item_id, quantidade: l.quantidade })),
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="itens" value={itensJson} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Cliente"
          htmlFor="cliente_id"
          required
          error={errors.cliente_id}
        >
          <Select
            id="cliente_id"
            name="cliente_id"
            defaultValue={locacao?.cliente_id ?? ""}
            required
          >
            <option value="" disabled>
              Selecione um cliente
            </option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Status" htmlFor="status" required error={errors.status}>
          <Select id="status" name="status" defaultValue={locacao?.status ?? "Orçamento"}>
            {STATUS_LOCACAO.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Data" htmlFor="data" required error={errors.data}>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={locacao?.data ?? new Date().toISOString().slice(0, 10)}
            required
          />
        </FormField>

        <FormField
          label="Data para Entrega"
          htmlFor="data_entrega"
          required
          error={errors.data_entrega}
        >
          <Input
            id="data_entrega"
            name="data_entrega"
            type="date"
            value={dataEntrega}
            onChange={(e) => {
              setDataEntrega(e.target.value);
              setDisponibilidade(null);
            }}
            required
          />
        </FormField>

        <FormField
          label="Data para Recolher"
          htmlFor="data_recolher"
          required
          error={errors.data_recolher}
        >
          <Input
            id="data_recolher"
            name="data_recolher"
            type="date"
            value={dataRecolher}
            onChange={(e) => {
              setDataRecolher(e.target.value);
              setDisponibilidade(null);
            }}
            required
          />
        </FormField>
      </div>

      <FormField
        label="Valor Frete (R$)"
        htmlFor="valor_frete"
        error={errors.valor_frete}
      >
        <Input
          id="valor_frete"
          name="valor_frete"
          type="number"
          min={0}
          step="0.01"
          value={valorFrete}
          onChange={(e) => setValorFrete(Number(e.target.value))}
          className="max-w-xs"
        />
      </FormField>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Itens da locação</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
          >
            + Adicionar item
          </Button>
        </div>

        {errors.itens && (
          <p className="mb-2 text-sm text-red-600">{errors.itens[0]}</p>
        )}

        <div className="space-y-2">
          {linhas.map((linha) => {
            const itemSelecionado = linha.item_id !== "" ? itensPorId.get(linha.item_id) : undefined;
            const disponibilidadeItem = disponibilidade?.find(
              (d) => d.item_id === linha.item_id,
            );

            return (
              <div
                key={linha.key}
                className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center"
              >
                <Select
                  className="sm:flex-1"
                  value={linha.item_id}
                  onChange={(e) => atualizarLinha(linha.key, "item_id", e.target.value)}
                >
                  <option value="" disabled>
                    Selecione um item
                  </option>
                  {itens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} — {formatarMoeda(item.preco_diaria)}/diária
                    </option>
                  ))}
                </Select>

                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={linha.quantidade}
                  onChange={(e) => atualizarLinha(linha.key, "quantidade", e.target.value)}
                  className="sm:w-28"
                  placeholder="Qtd."
                />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removerLinha(linha.key)}
                >
                  Remover
                </Button>

                {itemSelecionado && (
                  <span className="text-xs text-slate-500">
                    Estoque total: {itemSelecionado.estoque_total}
                    {disponibilidadeItem && (
                      <span
                        className={
                          disponibilidadeItem.ok
                            ? " text-emerald-600"
                            : " font-semibold text-red-600"
                        }
                      >
                        {" · disponível no período: "}
                        {Math.max(0, disponibilidadeItem.disponivel)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={checarDisponibilidade}
            disabled={verificando}
          >
            {verificando ? "Verificando..." : "Verificar disponibilidade"}
          </Button>
          {disponibilidade?.some((d) => !d.ok) && (
            <span className="text-sm font-medium text-red-600">
              Há itens sem estoque suficiente no período selecionado.
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md bg-slate-100 px-4 py-3">
        <span className="text-sm text-slate-600">Valor total estimado: </span>
        <span className="text-lg font-semibold text-slate-900">
          {formatarMoeda(valorTotal)}
        </span>
      </div>

      {state.formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar locação"}
        </Button>
        <LinkButton href="/locacoes" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  );
}

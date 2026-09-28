import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { Boleto } from "@/types";
import { formatCurrency, formatDate, daysUntil } from "@/utils/format";
import { StatusBadge } from "./StatusBadge";

interface BoletoTableProps {
  boletos: Boleto[];
  onEdit: (b: Boleto) => void;
  onDelete: (b: Boleto) => void;
}

const ALERT_STATUSES = ["Lançado", "Pendente"];

export function BoletoTable({
  boletos,
  onEdit,
  onDelete,
}: BoletoTableProps) {
  if (boletos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <AlertTriangle className="h-8 w-8 text-gray-400" />
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-700">
          Nenhum boleto encontrado
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Clique em "Novo boleto" para começar a cadastrar.
        </p>
      </div>
    );
  }

  const nfeByBoleto = new Map<string, Set<string>>();
  const boletoByNfe = new Map<string, Set<string>>();
  boletos.forEach((boleto) => {
    const boletoNumber = boleto.numero.trim();
    const nfeNumber = boleto.nfe.trim();
    if (!boletoNumber || boletoNumber === "-") return;

    if (nfeNumber) {
      const nfes = nfeByBoleto.get(boletoNumber) ?? new Set<string>();
      nfes.add(nfeNumber);
      nfeByBoleto.set(boletoNumber, nfes);

      const boletosDaNfe = boletoByNfe.get(nfeNumber) ?? new Set<string>();
      boletosDaNfe.add(boletoNumber);
      boletoByNfe.set(nfeNumber, boletosDaNfe);
    }
  });

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
        <span className="font-semibold text-gray-700">Legenda:</span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-sky-200 ring-1 ring-sky-300" />
          Várias NF-e em um boleto
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-yellow-200 ring-1 ring-yellow-300" />
          NF-e sem boleto
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-gray-300 ring-1 ring-gray-400" />
          Uma NF-e com vários boletos
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-violet-200 ring-1 ring-violet-300" />
          Boleto sem NF-e
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <th className="px-4 py-3 font-semibold">Empresa</th>
              <th className="px-4 py-3 font-semibold">NF-e</th>
              <th className="px-4 py-3 font-semibold">Nº Boleto</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Lançamento</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Lançado por</th>
              <th className="px-4 py-3 font-semibold">Observações</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {boletos.map((b) => {
              const d = daysUntil(b.dataVencimento);
              const isNear =
                ALERT_STATUSES.includes(b.status) && d >= 0 && d <= 3;
              const isOverdue =
                ALERT_STATUSES.includes(b.status) && d < 0;
              const hasNoBoleto = !b.numero.trim() || b.numero.trim() === "-";
              const hasMultipleNfes =
                !hasNoBoleto && (nfeByBoleto.get(b.numero.trim())?.size ?? 0) > 1;
              const hasMultipleBoletos =
                !!b.nfe.trim() && (boletoByNfe.get(b.nfe.trim())?.size ?? 0) > 1;
              const hasBoletoWithoutNfe = !b.nfe.trim() && !hasNoBoleto;
              const displayValue = b.status === "Nota sem boleto" ? b.valorNfe : b.valor;

              return (
                <tr
                  key={b.id}
                  className={`transition hover:bg-gray-50 ${
                    isNear
                      ? "bg-red-50"
                      : hasMultipleNfes
                        ? "bg-sky-100 hover:bg-sky-200"
                        : b.nfe.trim() && hasNoBoleto
                          ? "bg-yellow-100 hover:bg-yellow-200"
                          : hasMultipleBoletos
                            ? "bg-gray-200 hover:bg-gray-300"
                            : hasBoletoWithoutNfe
                              ? "bg-violet-200 hover:bg-violet-300"
                              : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{b.empresa}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {b.nfe || <span className="rounded bg-violet-200 px-2 py-0.5 font-semibold text-violet-800">Sem NF-e</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {b.numero || <span className="rounded bg-yellow-200 px-2 py-0.5 font-semibold text-yellow-800">Sem boleto</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {formatCurrency(displayValue)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(b.dataLancamento)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{formatDate(b.dataVencimento)}</div>
                    {isNear && (
                      <span className="text-xs font-semibold text-red-600">
                        Vence em {d === 0 ? "hoje" : `${d}d`}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-xs font-semibold text-red-700">
                        Vencido há {Math.abs(d)}d
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">{b.user_nome || b.user_email || "—"}</div>
                    {b.updated_at && (
                      <div className="text-xs text-gray-400">
                        Editado em {formatDate(b.updated_at.slice(0, 10))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="line-clamp-1 max-w-[140px]">
                      {b.observacoes || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(b)}
                        className="rounded-md p-1.5 text-blue-600 transition hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(b)}
                        className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

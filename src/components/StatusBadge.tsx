import type { Status } from "@/types";

const STYLES: Record<Status, string> = {
  Lançado: "bg-blue-100 text-blue-800 border-blue-300",
  Pendente: "bg-red-100 text-red-800 border-red-300",
  Pago: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Vencido: "bg-red-100 text-red-800 border-red-300",
  Cancelado: "bg-gray-200 text-gray-600 border-gray-300",
  "Nota sem boleto": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Boleto sem nota": "bg-violet-100 text-violet-800 border-violet-300",
};

const DOT: Record<Status, string> = {
  Lançado: "bg-blue-500",
  Pendente: "bg-red-500",
  Pago: "bg-emerald-500",
  Vencido: "bg-red-500",
  Cancelado: "bg-gray-400",
  "Nota sem boleto": "bg-yellow-500",
  "Boleto sem nota": "bg-violet-500",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {status}
    </span>
  );
}

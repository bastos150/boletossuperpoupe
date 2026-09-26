import {
  FileText,
  Clock,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import type { Boleto } from "@/types";
import { formatCurrency } from "@/utils/format";
import { daysUntil } from "@/utils/format";

interface StatCardsProps {
  boletos: Boleto[];
}

export function StatCards({ boletos }: StatCardsProps) {
  const total = boletos.length;
  const nfeCount = new Set(boletos.filter((b) => b.nfe).map((b) => b.nfe)).size;
  const pendentes = boletos.filter((b) => b.status === "Pendente");
  const vencem3dias = boletos.filter((b) => {
    const d = daysUntil(b.dataVencimento);
    return (b.status === "Pendente" || b.status === "Lançado") && d >= 0 && d <= 3;
  });

  const totalPendenteValor = pendentes.reduce((s, b) => s + b.valor, 0);
  const vencem3diasValor = vencem3dias.reduce((s, b) => s + b.valor, 0);

  const cards = [
    {
      label: "Total de boletos",
      value: String(total),
      sub: formatCurrency(boletos.reduce((s, b) => s + b.valor, 0)),
      icon: FileText,
      color: "bg-[#0a1f44]",
      iconBg: "bg-white/15",
    },
    {
      label: "NF-e lançadas",
      value: String(nfeCount),
      sub: `${boletos.filter((b) => b.nfe).length} boletos com NF-e`,
      icon: Receipt,
      color: "bg-[#1a4d8f]",
      iconBg: "bg-white/15",
    },
    {
      label: "Total pendente",
      value: String(pendentes.length),
      sub: formatCurrency(totalPendenteValor),
      icon: Clock,
      color: "bg-amber-500",
      iconBg: "bg-white/20",
    },
    {
      label: "Vencem em 3 dias",
      value: String(vencem3dias.length),
      sub: formatCurrency(vencem3diasValor),
      icon: AlertTriangle,
      color: vencem3dias.length > 0 ? "bg-red-600" : "bg-gray-500",
      iconBg: "bg-white/20",
      alert: vencem3dias.length > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative overflow-hidden rounded-xl ${c.color} p-5 text-white shadow-md transition hover:shadow-lg ${
            c.alert ? "ring-2 ring-red-300 ring-offset-1" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{c.label}</p>
              <p className="mt-1 text-3xl font-bold">{c.value}</p>
              <p className="mt-1 text-sm text-white/70">{c.sub}</p>
            </div>
            <div className={`rounded-lg ${c.iconBg} p-2.5`}>
              <c.icon className="h-6 w-6" />
            </div>
          </div>
          {c.alert && (
            <div className="mt-3 flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1.5 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              Atenção: vencimento próximo
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

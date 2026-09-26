import type { Boleto } from "@/types";
import { formatDate, formatCurrency } from "./format";

export function exportToCSV(boletos: Boleto[]): void {
  const headers = [
    "Empresa",
    "NF-e",
    "Número do Boleto",
    "Valor",
    "Data de Lançamento",
    "Data de Vencimento",
    "Status",
    "Responsável",
    "Lançado por",
    "Observações",
  ];

  const rows = boletos.map((b) => [
    b.empresa,
    b.nfe,
    b.numero,
    formatCurrency(b.valor),
    formatDate(b.dataLancamento),
    formatDate(b.dataVencimento),
    b.status,
    b.responsavel,
    b.user_nome || b.user_email || "",
    b.observacoes,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boletos-superpoupe-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

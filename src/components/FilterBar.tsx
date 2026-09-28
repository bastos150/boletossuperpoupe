import { Search, Filter, X } from "lucide-react";
import type { Status } from "@/types";

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: Status | "Todos";
  setStatusFilter: (v: Status | "Todos") => void;
  launchDate: string;
  setLaunchDate: (v: string) => void;
  periodStart: string;
  setPeriodStart: (v: string) => void;
  periodEnd: string;
  setPeriodEnd: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const STATUS_OPTIONS: (Status | "Todos")[] = [
  "Todos",
  "Lançado",
  "Pendente",
  "Pago",
  "Nota sem boleto",
  "Boleto sem nota",
];

export function FilterBar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  launchDate,
  setLaunchDate,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
        <Filter className="h-4 w-4" />
        Filtros
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {/* Busca */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "Todos")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "Todos" ? "Todos os status" : s}
            </option>
          ))}
        </select>

        {/* Data de lançamento */}
        <div>
          <label className="mb-1 block text-xs text-gray-500">Lançamento em</label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => setLaunchDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
          />
        </div>

        {/* Período início */}
        <div>
          <label className="mb-1 block text-xs text-gray-500">Vencimento a partir de</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
          />
        </div>

        {/* Período fim */}
        <div>
          <label className="mb-1 block text-xs text-gray-500">Vencimento até</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

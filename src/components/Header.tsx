import { Plus, Download, LogOut, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onNew: () => void;
  onExport: () => void;
  onExit: () => void;
  onManageUsers: () => void;
}

export function Header({ onNew, onExport, onExit, onManageUsers }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-20">
      <div className="bg-[#0a1f44] text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo[1].jpg"
                alt="SuperPoupe"
                className="h-12 w-12 shrink-0 rounded-full object-cover shadow ring-2 ring-[#ffc107]"
              />
              <div>
                <h1 className="text-lg font-bold leading-tight sm:text-xl">
                  Gestor de Boletos
                </h1>
                <p className="text-xs text-blue-100 sm:text-sm">
                  Controle de vencimentos e pagamentos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile?.is_admin && (
                <button
                  onClick={onManageUsers}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
                >
                  <Users className="h-4 w-4" />
                  Usuários
                </button>
              )}
              <button
                onClick={onNew}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#ffc107] px-3 py-2 text-sm font-semibold text-[#0a1f44] transition hover:bg-yellow-400 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Novo boleto
              </button>
              <button
                onClick={onExport}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              <button
                onClick={onExit}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          {profile && (
            <div className="mt-2 border-t border-white/10 pt-2 text-xs text-blue-100">
              Conectado como: <span className="font-semibold text-white">{profile.nome || profile.email}</span>
              {profile.is_admin && <span className="ml-2 rounded bg-[#ffc107] px-1.5 py-0.5 text-[10px] font-bold text-[#0a1f44]">ADMIN</span>}
            </div>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-[#ffc107]" />
    </header>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { StatCards } from "@/components/StatCards";
import { FilterBar, type UserInfo } from "@/components/FilterBar";
import { BoletoTable } from "@/components/BoletoTable";
import { BoletoFormModal } from "@/components/BoletoFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Toast, type ToastType } from "@/components/Toast";
import { LoginScreen } from "@/components/LoginScreen";
import { UserPanel } from "@/components/UserPanel";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import type { Boleto, BoletoInstallment, Status } from "@/types";
import { supabase } from "@/lib/supabase";
import { exportToCSV } from "@/utils/csv";
import { daysUntil, todayISO } from "@/utils/format";

const ALERT_STATUSES = ["Lançado", "Pendente"];

function Dashboard() {
  const { user, loading, signOut } = useAuth();

  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Todos">("Todos");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Boleto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Boleto | null>(null);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const currentDate = todayISO();

  const showToast = (message: string, type: ToastType = "success") =>
    setToast({ message, type });

  const fetchBoletos = useCallback(async () => {
    setDataLoading(true);
    const { data, error } = await supabase
      .from("boletos")
      .select(`
        id, empresa, cnpj, nfe, numero, valor, data_lancamento, data_vencimento,
        status, responsavel, observacoes, user_id, updated_by, updated_at,
        user_profiles!boletos_user_profiles_fkey (email, nome)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Erro ao carregar boletos.", "error");
      setDataLoading(false);
      return;
    }

    const mapped: Boleto[] = (data || []).map((row: Record<string, unknown>) => {
      const profileData = row.user_profiles as { email: string; nome: string } | null;
      return {
        id: row.id as string,
        empresa: row.empresa as string,
        cnpj: (row.cnpj as string) || "",
        nfe: (row.nfe as string) || "",
        numero: row.numero as string,
        valor: Number(row.valor),
        dataLancamento: row.data_lancamento as string,
        dataVencimento: row.data_vencimento as string,
        status: row.status as Status,
        responsavel: (row.responsavel as string) || "",
        observacoes: (row.observacoes as string) || "",
        user_id: row.user_id as string,
        user_email: profileData?.email,
        user_nome: profileData?.nome,
        updated_by: (row.updated_by as string | null) ?? null,
        updated_at: (row.updated_at as string) ?? undefined,
      };
    });

    setBoletos(mapped);
    setDataLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, nome, email")
      .order("nome", { ascending: true });

    if (!error && data) {
      setUsers(data as UserInfo[]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBoletos();
      fetchUsers();
    }
  }, [user, fetchBoletos, fetchUsers]);

  // Auto-mark overdue boletos
  const computedBoletos = useMemo(() => {
    return boletos.map((b) => {
      if (ALERT_STATUSES.includes(b.status) && daysUntil(b.dataVencimento) < 0) {
        return { ...b, status: "Vencido" as Status };
      }
      return b;
    });
  }, [boletos]);

  // Persist auto-computed overdue status to DB
  useEffect(() => {
    const overdue = computedBoletos.filter(
      (cb, i) => cb.status !== boletos[i]?.status && cb.status === "Vencido",
    );
    if (overdue.length > 0) {
      overdue.forEach((b) => {
        supabase.from("boletos").update({ status: "Vencido" }).eq("id", b.id).then();
      });
    }
  }, [computedBoletos, boletos]);

  const todayBoletos = useMemo(
    () => computedBoletos.filter((b) => b.dataLancamento === currentDate),
    [computedBoletos, currentDate],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todayBoletos.filter((b) => {
      if (statusFilter !== "Todos" && b.status !== statusFilter) return false;
      if (periodStart && b.dataVencimento < periodStart) return false;
      if (periodEnd && b.dataVencimento > periodEnd) return false;
      if (userFilter && b.user_id !== userFilter) return false;
      if (q) {
        const hay = `${b.empresa} ${b.cnpj} ${b.numero} ${b.nfe} ${b.dataLancamento} ${b.dataVencimento} ${b.valor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [todayBoletos, search, statusFilter, periodStart, periodEnd, userFilter]);

  const hasActiveFilters =
    !!search || statusFilter !== "Todos" || !!periodStart || !!periodEnd || !!userFilter;

  const handleSave = (
    installments: BoletoInstallment[],
    shared: { empresa: string; nfe: string; observacoes: string },
    id?: string,
  ): string | null => {
    const existingNumbers = new Set(
      boletos
        .filter((b) => b.id !== id && b.numero.trim())
        .map((b) => `${b.empresa.trim().toLowerCase()}::${b.numero.trim()}`),
    );
    const duplicate = installments.find((item) => {
      const numero = item.numero.trim();
      return numero && existingNumbers.has(`${shared.empresa.trim().toLowerCase()}::${numero}`);
    });
    if (duplicate) {
      return `O boleto ${duplicate.numero} desta empresa já está cadastrado.`;
    }

    const overdue = installments.find((item) => item.dataVencimento && item.dataVencimento < todayISO());
    if (overdue) {
      return "A data de vencimento não pode ser anterior à data de hoje.";
    }

    if (id) {
      const inst = installments[0];
      const hasBoleto = inst.status !== "Nota sem boleto";
      supabase
        .from("boletos")
        .update({
          empresa: shared.empresa,
          nfe: shared.nfe,
          numero: hasBoleto ? inst.numero.trim() : null,
          valor: hasBoleto ? inst.valor : null,
          data_vencimento: hasBoleto ? inst.dataVencimento : null,
          status: inst.status,
          responsavel: null,
          observacoes: shared.observacoes,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) showToast("Erro ao atualizar boleto.", "error");
          else { showToast("Boleto atualizado com sucesso!"); fetchBoletos(); }
        });
    } else {
      const today = todayISO();
      const rows = installments.map((inst) => {
        const hasBoleto = inst.status !== "Nota sem boleto";
        return {
          empresa: shared.empresa,
          nfe: shared.nfe,
          numero: hasBoleto ? inst.numero.trim() : null,
          valor: hasBoleto ? inst.valor : null,
          data_lancamento: today,
          data_vencimento: hasBoleto ? inst.dataVencimento : null,
          status: inst.status,
          responsavel: null,
          observacoes: shared.observacoes,
        };
      });

      supabase.from("boletos").insert(rows).then(({ error }) => {
        if (error) showToast("Erro ao cadastrar boleto.", "error");
        else {
          showToast(
            rows.length === 1 ? "Boleto cadastrado com sucesso!" : `${rows.length} boletos cadastrados!`,
          );
          fetchBoletos();
          fetchUsers();
        }
      });
    }

    return null;
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    supabase
      .from("boletos")
      .delete()
      .eq("id", deleteTarget.id)
      .then(({ error }) => {
        if (error) showToast("Erro ao excluir boleto.", "error");
        else { showToast("Boleto excluído.", "error"); fetchBoletos(); }
      });
    setDeleteTarget(null);
  };

  const handleStatusChange = (id: string, status: Status) => {
    supabase
      .from("boletos")
      .update({ status })
      .eq("id", id)
      .then(({ error }) => {
        if (error) showToast("Erro ao alterar status.", "error");
        else { showToast(`Status alterado para "${status}".`); fetchBoletos(); }
      });
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("Todos");
    setPeriodStart("");
    setPeriodEnd("");
    setUserFilter("");
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showToast("Nenhum boleto para exportar.", "error");
      return;
    }
    exportToCSV(filtered);
    showToast("Arquivo CSV exportado!");
  };

  const handleExit = async () => {
    await signOut();
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (b: Boleto) => {
    setEditing(b);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        onNew={handleNew}
        onExport={handleExport}
        onExit={handleExit}
        onManageUsers={() => setUserPanelOpen(true)}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <StatCards boletos={todayBoletos} />

        <FilterBar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          periodStart={periodStart}
          setPeriodStart={setPeriodStart}
          periodEnd={periodEnd}
          setPeriodEnd={setPeriodEnd}
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          users={users}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {dataLoading ? (
          <div className="flex items-center justify-center rounded-xl bg-white py-16 shadow-sm">
            <span className="text-sm text-gray-400">Carregando boletos...</span>
          </div>
        ) : (
          <BoletoTable
            boletos={filtered}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
            onStatusChange={handleStatusChange}
          />
        )}

        <footer className="pt-2 text-center text-xs text-gray-400">
          SuperPoupe – Gestor de Boletos · Conectado ao banco de dados
        </footer>
      </main>

      <BoletoFormModal
        open={formOpen}
        editing={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Deseja realmente excluir o boleto "${deleteTarget?.numero}" da empresa "${deleteTarget?.empresa}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <UserPanel
        open={userPanelOpen}
        onClose={() => setUserPanelOpen(false)}
        onToast={showToast}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

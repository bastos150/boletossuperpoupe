import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { StatCards } from "@/components/StatCards";
import { FilterBar } from "@/components/FilterBar";
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
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const fetchRequestRef = useRef(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Todos">("Todos");
  const [launchDate, setLaunchDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Boleto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Boleto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "success") =>
    setToast({ message, type });

  const fetchBoletos = useCallback(async () => {
    const requestId = ++fetchRequestRef.current;
    setDataLoading(true);
    setDataError(null);
    const { data, error } = await supabase
      .from("boletos")
      .select(`
        id, empresa, cnpj, nfe, numero, valor, valor_nfe, data_lancamento, data_vencimento,
        status, responsavel, observacoes, user_id, updated_by, updated_at,
        user_profiles!boletos_user_profiles_fkey (email, nome)
      `)
      .order("created_at", { ascending: false });

    if (requestId !== fetchRequestRef.current) return;

    if (error) {
      console.error("Erro ao carregar boletos", error);
      setDataError("Não foi possível consultar os boletos. Seus dados não foram apagados.");
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
        numero: (row.numero as string) || "",
        valor: Number(row.valor) || 0,
        valorNfe: Number(row.valor_nfe) || 0,
        dataLancamento: row.data_lancamento as string,
        dataVencimento: (row.data_vencimento as string) || "",
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
    setDataError(null);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchBoletos();
    }
  }, [user, fetchBoletos]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return computedBoletos.filter((b) => {
      if (statusFilter !== "Todos" && b.status !== statusFilter) return false;
      if (launchDate && b.dataLancamento !== launchDate) return false;
      if (periodStart && b.dataVencimento < periodStart) return false;
      if (periodEnd && b.dataVencimento > periodEnd) return false;
      if (q && !b.empresa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [computedBoletos, search, statusFilter, launchDate, periodStart, periodEnd]);

  const hasActiveFilters =
    !!search || statusFilter !== "Todos" || !!launchDate || !!periodStart || !!periodEnd;

  const handleSave = async (
    installments: BoletoInstallment[],
    shared: { empresa: string; nfe: string; observacoes: string },
    id?: string,
  ): Promise<string | null> => {
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
      const { data, error } = await supabase
        .from("boletos")
        .update({
          empresa: shared.empresa,
          nfe: shared.nfe,
          numero: hasBoleto ? inst.numero.trim() : null,
          valor: hasBoleto ? inst.valor : null,
          valor_nfe: hasBoleto ? null : inst.valorNfe,
          data_vencimento: hasBoleto ? inst.dataVencimento : null,
          status: inst.status,
          responsavel: null,
          observacoes: shared.observacoes,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) return `Erro ao atualizar boleto: ${error.message}`;
      if (!data) return "Não foi possível atualizar: boleto não encontrado ou sem permissão.";
      showToast("Boleto atualizado com sucesso!");
      await fetchBoletos();
    } else {
      const today = todayISO();
      const rows = installments.map((inst) => {
        const hasBoleto = inst.status !== "Nota sem boleto";
        return {
          empresa: shared.empresa,
          nfe: shared.nfe,
          numero: hasBoleto ? inst.numero.trim() : null,
          valor: hasBoleto ? inst.valor : null,
          valor_nfe: hasBoleto ? null : inst.valorNfe,
          data_lancamento: today,
          data_vencimento: hasBoleto ? inst.dataVencimento : null,
          status: inst.status,
          responsavel: null,
          observacoes: shared.observacoes,
        };
      });

      const { data, error } = await supabase.from("boletos").insert(rows).select("id");
      if (error) return `Erro ao cadastrar boleto: ${error.message}`;
      if (!data || data.length !== rows.length) return "Não foi possível confirmar o cadastro dos boletos.";
      showToast(
        rows.length === 1 ? "Boleto cadastrado com sucesso!" : `${rows.length} boletos cadastrados!`,
      );
      await fetchBoletos();
    }

    return null;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const nfe = deleteTarget.nfe.trim();
    const empresa = deleteTarget.empresa.trim();
    let deleteQuery = supabase.from("boletos").delete().select("id");

    // Uma NF-e pode ter vários boletos/parcela. Sem NF-e, apaga somente o boleto selecionado.
    if (nfe) {
      deleteQuery = deleteQuery.eq("empresa", empresa).eq("nfe", deleteTarget.nfe);
    } else {
      deleteQuery = deleteQuery.eq("id", deleteTarget.id);
    }

    const { data, error } = await deleteQuery;
    setDeleteLoading(false);
    if (error) {
      showToast(`Erro ao excluir boleto: ${error.message}`, "error");
      return;
    }
    if (!data || data.length === 0) {
      showToast("Não foi possível excluir: boleto não encontrado ou sem permissão.", "error");
      return;
    }
    setDeleteTarget(null);
    showToast("Boleto excluído!");
    await fetchBoletos();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("Todos");
    setLaunchDate("");
    setPeriodStart("");
    setPeriodEnd("");
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
        {dataLoading ? (
          <div className="flex items-center justify-center rounded-xl bg-white py-16 shadow-sm">
            <span className="text-sm text-gray-400">Consultando boletos...</span>
          </div>
        ) : dataError ? (
          <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <h2 className="text-base font-bold text-red-800">Falha ao consultar os boletos</h2>
            <p className="mt-2 text-sm text-red-700">{dataError}</p>
            <button
              type="button"
              onClick={() => void fetchBoletos()}
              className="mt-4 rounded-md bg-[#0a1f44] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2a5c]"
            >
              Tentar novamente
            </button>
          </section>
        ) : (
          <>
            <StatCards boletos={computedBoletos} />

            <FilterBar
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              launchDate={launchDate}
              setLaunchDate={setLaunchDate}
              periodStart={periodStart}
              setPeriodStart={setPeriodStart}
              periodEnd={periodEnd}
              setPeriodEnd={setPeriodEnd}
              onClear={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            <BoletoTable
              boletos={filtered}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          </>
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
        message={deleteTarget?.nfe.trim()
          ? `Deseja realmente excluir todos os boletos vinculados à NF-e "${deleteTarget.nfe}" da empresa "${deleteTarget.empresa}"? Esta ação não pode ser desfeita.`
          : `Deseja realmente excluir o boleto "${deleteTarget?.numero}" da empresa "${deleteTarget?.empresa}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        busy={deleteLoading}
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

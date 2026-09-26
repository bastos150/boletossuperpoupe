import { useEffect, useState } from "react";
import { X, UserPlus, Trash2, Pencil, Shield, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface ManagedUser {
  id: string;
  email: string;
  nome: string;
  is_admin: boolean;
  created_at: string;
}

interface UserPanelProps {
  open: boolean;
  onClose: () => void;
  onToast: (message: string, type?: "success" | "error") => void;
}

export function UserPanel({ open, onClose, onToast }: UserPanelProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", nome: "", is_admin: false });
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  if (!open || !profile?.is_admin) return null;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      if (json.users) setUsers(json.users);
    } catch {
      onToast("Erro ao carregar usuários.", "error");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ email: "", password: "", nome: "", is_admin: false });
    setEditingId(null);
    setFormOpen(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || (!editingId && !form.password)) {
      setError("Email e senha são obrigatórios.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres, com letras e números.");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { id: editingId, password: form.password || undefined, nome: form.nome, is_admin: form.is_admin }
            : { email: form.email, password: form.password, nome: form.nome, is_admin: form.is_admin }
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao salvar usuário.");
        return;
      }
      onToast(editingId ? "Usuário atualizado!" : "Usuário criado!");
      resetForm();
      fetchUsers();
    } catch {
      setError("Erro de conexão.");
    }
  };

  const handleEdit = (u: ManagedUser) => {
    setForm({ email: u.email, password: "", nome: u.nome, is_admin: u.is_admin });
    setEditingId(u.id);
    setFormOpen(true);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este usuário?")) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?id=${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) {
        onToast(json.error || "Erro ao excluir.", "error");
        return;
      }
      onToast("Usuário excluído.");
      fetchUsers();
    } catch {
      onToast("Erro de conexão.", "error");
    }
  };

  const fieldClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]";
  const labelClass = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#0a1f44]" />
            <h2 className="text-lg font-bold text-[#0a1f44]">Gerenciar Usuários</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {users.length} de 4 usuários cadastrados
            </p>
            {!formOpen && users.length < 4 && (
              <button
                onClick={() => { setForm({ email: "", password: "", nome: "", is_admin: false }); setEditingId(null); setFormOpen(true); setError(""); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0a1f44] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2a5c]"
              >
                <UserPlus className="h-4 w-4" />
                Novo usuário
              </button>
            )}
          </div>

          {formOpen && (
            <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-bold text-gray-700">
                {editingId ? "Editar usuário" : "Cadastrar novo usuário"}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={form.email} disabled={!!editingId}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`${fieldClass} ${editingId ? "bg-gray-100 text-gray-500" : ""}`} placeholder="usuario@email.com" />
                </div>
                <div>
                  <label className={labelClass}>{editingId ? "Nova senha (deixe vazio para manter)" : "Senha *"}</label>
                  <input type="password" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={fieldClass} placeholder="••••••••" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome</label>
                  <input type="text" value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={fieldClass} placeholder="Nome do usuário" />
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 pb-2">
                    <input type="checkbox" checked={form.is_admin}
                      onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#0a1f44] focus:ring-[#0a1f44]" />
                    <span className="text-sm font-medium text-gray-700">Administrador</span>
                  </label>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={resetForm}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-300">Cancelar</button>
                <button type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0a1f44] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2a5c]">
                  <UserPlus className="h-4 w-4" />{editingId ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${u.is_admin ? "bg-[#ffc107]" : "bg-gray-200"} text-sm font-bold ${u.is_admin ? "text-[#0a1f44]" : "text-gray-500"}`}>
                      {u.nome.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{u.nome || u.email}</span>
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(u)}
                      className="rounded-md p-2 text-blue-600 transition hover:bg-blue-50" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== profile?.id && (
                      <button onClick={() => handleDelete(u.id)}
                        className="rounded-md p-2 text-red-600 transition hover:bg-red-50" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

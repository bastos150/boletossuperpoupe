import { useEffect, useState } from "react";
import { X, Save, PlusCircle, CheckCircle2, Trash2 } from "lucide-react";
import type { Boleto, BoletoInstallment, Status } from "@/types";
import { todayISO, formatDate } from "@/utils/format";

interface BoletoFormModalProps {
  open: boolean;
  editing: Boleto | null;
  onClose: () => void;
  onSave: (installments: BoletoInstallment[], shared: {
    empresa: string;
    nfe: string;
    responsavel: string;
    observacoes: string;
  }, id?: string) => string | null;
}

function emptyInstallment(): BoletoInstallment {
  return { numero: "", valor: 0, dataVencimento: "", status: "Lançado" };
}

export function BoletoFormModal({ open, editing, onClose, onSave }: BoletoFormModalProps) {
  const [empresa, setEmpresa] = useState("");
  const [nfe, setNfe] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataLancamento, setDataLancamento] = useState(todayISO());
  const [installments, setInstallments] = useState<BoletoInstallment[]>([emptyInstallment()]);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<{ count: number; nfe: string } | null>(null);

  useEffect(() => {
    if (editing) {
      setEmpresa(editing.empresa);
      setNfe(editing.nfe);
      setResponsavel(editing.responsavel);
      setObservacoes(editing.observacoes);
      setDataLancamento(editing.dataLancamento);
      setInstallments([{
        numero: editing.numero,
        valor: editing.valor,
        dataVencimento: editing.dataVencimento,
        status: editing.status,
      }]);
      setLastSaved(null);
    } else {
      setEmpresa("");
      setNfe("");
      setResponsavel("");
      setObservacoes("");
      setDataLancamento(todayISO());
      setInstallments([emptyInstallment()]);
      setLastSaved(null);
    }
    setError("");
  }, [editing, open]);

  if (!open) return null;

  const updateInstallment = (
    index: number,
    field: keyof BoletoInstallment,
    value: string | number,
  ) => {
    setInstallments((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const validate = (): string | null => {
    if (!empresa.trim()) return "Informe o nome da empresa.";
    if (!responsavel.trim()) return "Informe o responsável.";
    if (installments.some((item) => !item.numero.trim())) return "Informe o número de todos os boletos.";
    if (installments.some((item) => !item.valor || item.valor <= 0)) return "Informe um valor válido para todos os boletos.";
    if (installments.some((item) => !item.dataVencimento)) return "Informe o vencimento de todos os boletos.";
    const numbers = installments.map((item) => item.numero.trim());
    if (new Set(numbers).size !== numbers.length) return "Cada boleto desta NF-e precisa ter um número diferente.";
    return null;
  };

  const shared = { empresa, nfe, responsavel, observacoes };

  const resetForNext = () => {
    setEmpresa("");
    setNfe("");
    setResponsavel("");
    setObservacoes("");
    setDataLancamento(todayISO());
    setInstallments([emptyInstallment()]);
    setError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    const result = onSave(installments, shared, editing?.id);
    if (result) return setError(result);
    setLastSaved({ count: installments.length, nfe: nfe.trim() });
  };

  const handleSaveAndNew = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    const result = onSave(installments, shared);
    if (result) return setError(result);
    setLastSaved({ count: installments.length, nfe: nfe.trim() });
    resetForNext();
  };

  const fieldClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]";
  const labelClass = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1f44]">{editing ? "Editar boleto" : "Novo boleto"}</h2>
            {!editing && <p className="mt-0.5 text-xs text-gray-500">Uma NF-e pode ter vários boletos com vencimentos diferentes.</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {lastSaved && !editing && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {lastSaved.count === 1 ? "Boleto cadastrado" : `${lastSaved.count} boletos cadastrados`} com sucesso{lastSaved.nfe ? ` na NF-e ${lastSaved.nfe}` : ""}.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className={labelClass}>Empresa *</label>
            <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={fieldClass} placeholder="Nome da empresa" />
          </div>

          <div>
            <label className={labelClass}>Número(s) da NF-e</label>
            <input type="text" value={nfe} onChange={(e) => setNfe(e.target.value)} className={fieldClass} placeholder="Ex.: NF-e 12345, NF-e 67890" />
            <p className="mt-1 text-xs text-gray-400">Informe um ou mais números separados por vírgula.</p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0a1f44]">Boletos desta NF-e</h3>
                <p className="text-xs text-gray-500">Cadastre cada parcela com seu próprio número, valor e vencimento.</p>
              </div>
              {!editing && (
                <button type="button" onClick={() => setInstallments((current) => [...current, emptyInstallment()])} className="inline-flex items-center gap-1.5 rounded-md bg-[#0a1f44] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0d2a5c]">
                  <PlusCircle className="h-4 w-4" /> Adicionar boleto
                </button>
              )}
            </div>

            <div className="space-y-3">
              {installments.map((item, index) => (
                <div key={index} className="rounded-md border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Boleto {index + 1}</span>
                    {!editing && installments.length > 1 && (
                      <button type="button" onClick={() => setInstallments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-red-500 transition hover:bg-red-50" title="Remover boleto"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                      <label className={labelClass}>Número *</label>
                      <input type="text" value={item.numero} onChange={(e) => updateInstallment(index, "numero", e.target.value)} className={fieldClass} placeholder="000123" />
                    </div>
                    <div>
                      <label className={labelClass}>Valor (R$) *</label>
                      <input type="number" step="0.01" min="0" value={item.valor || ""} onChange={(e) => updateInstallment(index, "valor", parseFloat(e.target.value) || 0)} className={fieldClass} placeholder="0,00" />
                    </div>
                    <div>
                      <label className={labelClass}>Vencimento *</label>
                      <input type="date" min={todayISO()} value={item.dataVencimento} onChange={(e) => updateInstallment(index, "dataVencimento", e.target.value)} className={fieldClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select value={item.status} onChange={(e) => updateInstallment(index, "status", e.target.value)} className={fieldClass}>
                        {(["Lançado", "Nota sem boleto", "Boleto sem nota", "Pendente", "Pago", "Vencido", "Cancelado"] as Status[]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Data de lançamento</label>
              <input type="text" value={formatDate(dataLancamento)} readOnly className={`${fieldClass} cursor-not-allowed bg-gray-100 text-gray-500`} />
              <p className="mt-1 text-xs text-gray-400">Preenchida automaticamente, não editável.</p>
            </div>
            <div>
              <label className={labelClass}>Responsável *</label>
              <input type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={fieldClass} placeholder="Nome do responsável" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} className={fieldClass} placeholder="Observações adicionais..." />
          </div>

          {error && <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200">Cancelar</button>
            {!editing && <button type="button" onClick={handleSaveAndNew} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#ffc107] px-5 py-2 text-sm font-semibold text-[#0a1f44] transition hover:bg-yellow-400 active:scale-95"><PlusCircle className="h-4 w-4" />Salvar e cadastrar outro</button>}
            <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0a1f44] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2a5c] active:scale-95"><Save className="h-4 w-4" />{editing ? "Salvar alterações" : "Cadastrar boleto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

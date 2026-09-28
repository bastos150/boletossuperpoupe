export type Status = "Lançado" | "Pendente" | "Pago" | "Vencido" | "Cancelado" | "Nota sem boleto" | "Boleto sem nota";

export interface Boleto {
  id: string;
  empresa: string;
  cnpj: string;
  nfe: string;
  numero: string;
  valor: number;
  valorNfe: number;
  dataLancamento: string;
  dataVencimento: string;
  status: Status;
  responsavel: string;
  observacoes: string;
  user_id: string;
  user_email?: string;
  user_nome?: string;
  updated_by?: string | null;
  updated_at?: string;
}

export type BoletoForm = Omit<Boleto, "id" | "user_id" | "user_email" | "user_nome" | "updated_by" | "updated_at">;

export interface BoletoInstallment {
  numero: string;
  valor: number;
  valorNfe: number;
  dataVencimento: string;
  status: Status;
}

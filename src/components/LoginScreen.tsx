import { useState } from "react";
import { Lock, Mail, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img
            src="/logo[1].jpg"
            alt="SuperPoupe"
            className="mx-auto h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-[#ffc107]"
          />
          <h1 className="mt-4 text-2xl font-bold text-[#0a1f44]">SuperPoupe</h1>
          <p className="text-sm text-gray-500">Gestor de Boletos</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-lg font-bold text-gray-700">Entrar no sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Senha</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#0a1f44] focus:ring-1 focus:ring-[#0a1f44]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0a1f44] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2a5c] active:scale-95 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Acesso restrito. Procure o administrador para criar sua conta.
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Link2 } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 text-amber-400 font-display font-bold text-sm tracking-widest uppercase mb-6 justify-center">
          <Link2 size={16} /> Link Reklam Platformu
        </div>
        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50 backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Lock size={18} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">Yönetim Girişi</h1>
              <p className="text-xs text-zinc-500">Devam etmek için giriş yapın</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-sm">E-posta</Label>
              <Input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 bg-zinc-950 border-zinc-800 text-white"
                placeholder="admin@ornek.com"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Şifre</Label>
              <Input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 bg-zinc-950 border-zinc-800 text-white"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p data-testid="login-error" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <Button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-black hover:bg-amber-300 font-display font-bold"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Giriş Yap"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

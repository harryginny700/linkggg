import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import PublicSiteRenderer from "@/components/PublicSiteRenderer";
import { Loader2, ArrowUpRight, LayoutDashboard, Link2 } from "lucide-react";

export default function Home() {
  const [state, setState] = useState({ loading: true, bound: null });
  const [sites, setSites] = useState([]);

  useEffect(() => {
    api
      .get("/public/resolve", { params: { host: window.location.hostname } })
      .then((res) => setState({ loading: false, bound: res.data }))
      .catch(() => {
        setState({ loading: false, bound: null });
        api.get("/public/sites").then((r) => setSites(r.data)).catch(() => {});
      });
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508] text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (state.bound) return <PublicSiteRenderer data={state.bound} />;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex items-center gap-2 text-amber-400 font-display font-bold text-sm tracking-widest uppercase mb-4">
          <Link2 size={16} /> Link Reklam Platformu
        </div>
        <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] max-w-3xl">
          Tek panelden <span className="text-amber-400">sınırsız</span> reklam sitesi yönetin.
        </h1>
        <p className="text-zinc-400 mt-5 max-w-xl text-base">
          Kolonları, renkleri, boyutları ve linkleri özelleştirin. Kendi domaininizi bağlayın,
          birden fazla temayı aynı anda yayınlayın.
        </p>
        <Link
          to="/admin/login"
          data-testid="home-admin-btn"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full bg-amber-400 text-black font-display font-bold hover:brightness-110 transition-[filter,transform] hover:scale-105"
        >
          <LayoutDashboard size={18} /> Yönetim Paneli
        </Link>

        {sites.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display font-bold text-lg mb-4 text-zinc-300">Yayındaki Siteler</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((s) => (
                <Link
                  key={s.id}
                  to={`/site/${s.slug}`}
                  data-testid={`home-site-${s.slug}`}
                  className="group border border-zinc-800 rounded-xl p-5 hover:border-amber-400/60 transition-colors bg-zinc-900/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">{s.name}</span>
                    <ArrowUpRight size={18} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">/site/{s.slug}{s.domain ? ` · ${s.domain}` : ""}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

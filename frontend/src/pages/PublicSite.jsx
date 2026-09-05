import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import PublicSiteRenderer from "@/components/PublicSiteRenderer";
import { Loader2 } from "lucide-react";

export default function PublicSite() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const params = slug ? { slug } : { host: window.location.hostname };
    api
      .get("/public/resolve", { params })
      .then((res) => setState({ loading: false, data: res.data, error: null }))
      .catch((e) => setState({ loading: false, data: null, error: e.response?.status === 404 ? "notfound" : "error" }));
  }, [slug]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508] text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] text-zinc-400 gap-2 px-4 text-center">
        <h1 className="font-display text-2xl text-white">Site bulunamadı</h1>
        <p className="text-sm">Bu adreste yayında bir site yok.</p>
      </div>
    );
  }
  return <PublicSiteRenderer data={state.data} />;
}

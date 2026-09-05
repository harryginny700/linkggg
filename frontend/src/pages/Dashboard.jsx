import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Settings, Trash2, ExternalLink, MousePointerClick, Layers, LogOut, Link2, Globe, Copy } from "lucide-react";

export default function Dashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const load = () => {
    api.get("/sites").then((r) => setSites(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createSite = async () => {
    if (!name.trim()) return;
    try {
      const res = await api.post("/sites", { name });
      setOpen(false);
      setName("");
      toast.success("Site oluşturuldu");
      navigate(`/admin/sites/${res.data.id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const togglePublish = async (site) => {
    try {
      await api.put(`/sites/${site.id}`, { published: !site.published });
      toast.success(!site.published ? "Site yayınlandı" : "Yayından kaldırıldı");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/sites/${id}`);
      toast.success("Site silindi");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const duplicate = async (site) => {
    try {
      const res = await api.post(`/sites/${site.id}/duplicate`);
      toast.success("Site kopyalandı");
      navigate(`/admin/sites/${res.data.id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-[#09090b]/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-amber-400">
            <Link2 size={18} /> Reklam Panosu
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-btn" className="text-zinc-400 hover:text-white">
              <LogOut size={16} className="mr-1" /> Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl">Sitelerim</h1>
            <p className="text-sm text-zinc-500 mt-1">Tüm reklam sitelerinizi tek yerden yönetin</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-site-btn" className="bg-amber-400 text-black hover:bg-amber-300 font-display font-bold">
                <Plus size={18} className="mr-1" /> Yeni Site
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="font-display">Yeni Site Oluştur</DialogTitle>
              </DialogHeader>
              <div>
                <Label className="text-zinc-400">Site Adı</Label>
                <Input
                  data-testid="new-site-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Güvenilir Siteler"
                  className="mt-1.5 bg-zinc-950 border-zinc-800"
                  onKeyDown={(e) => e.key === "Enter" && createSite()}
                />
              </div>
              <DialogFooter>
                <Button data-testid="create-site-confirm" onClick={createSite} className="bg-amber-400 text-black hover:bg-amber-300">
                  Oluştur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-zinc-500">Yükleniyor...</p>
        ) : sites.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-16 text-center text-zinc-500">
            Henüz site yok. "Yeni Site" ile başlayın.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((site) => (
              <div
                key={site.id}
                data-testid={`site-card-${site.id}`}
                className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/40 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg">{site.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">/site/{site.slug}</p>
                    {site.domain && (
                      <p className="text-xs text-amber-400/80 mt-0.5 flex items-center gap-1">
                        <Globe size={11} /> {site.domain}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      site.published ? "bg-green-500/15 text-green-400" : "bg-zinc-700/40 text-zinc-400"
                    }`}
                  >
                    {site.published ? "YAYINDA" : "TASLAK"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5"><Layers size={14} /> {site.card_count} kolon</span>
                  <span className="flex items-center gap-1.5"><MousePointerClick size={14} /> {site.total_clicks} tık</span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      data-testid={`publish-toggle-${site.id}`}
                      checked={site.published}
                      onCheckedChange={() => togglePublish(site)}
                    />
                    <span className="text-xs text-zinc-500">Yayın</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/site/${site.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`view-site-${site.id}`}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Önizle"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <Link
                      to={`/admin/sites/${site.id}`}
                      data-testid={`edit-site-${site.id}`}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Düzenle"
                    >
                      <Settings size={16} />
                    </Link>
                    <button
                      onClick={() => duplicate(site)}
                      data-testid={`duplicate-site-${site.id}`}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Kopyala"
                    >
                      <Copy size={16} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          data-testid={`delete-site-${site.id}`}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Site silinsin mi?</AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-400">
                            "{site.name}" ve tüm kolonları kalıcı olarak silinecek.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300">Vazgeç</AlertDialogCancel>
                          <AlertDialogAction
                            data-testid={`confirm-delete-${site.id}`}
                            onClick={() => remove(site.id)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

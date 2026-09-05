import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PublicSiteRenderer from "@/components/PublicSiteRenderer";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Eye, Pencil, GripVertical } from "lucide-react";

function Color({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-zinc-400 text-xs">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="h-9 w-12 rounded-md bg-transparent border border-zinc-800 cursor-pointer"
        />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="bg-zinc-950 border-zinc-800 text-xs h-9" />
      </div>
    </div>
  );
}

const emptyCard = { title: "", link: "", logo_url: "", span: 1, bg_color: "", text_color: "", border_style: null, border_color: "", border_from: "", border_to: "", badge_text: "", badge_color: "#FACC15", animation: null, active: true };

export default function SiteEditor() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cardDialog, setCardDialog] = useState(null); // {mode, card}
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const load = () => {
    api.get(`/sites/${id}`).then((r) => {
      setSite(r.data.site);
      setCards(r.data.cards);
    });
  };
  useEffect(load, [id]);

  const setS = (key, val) => setSite((p) => ({ ...p, settings: { ...p.settings, [key]: val } }));
  const setMeta = (key, val) => setSite((p) => ({ ...p, [key]: val }));

  const saveSite = async () => {
    setSaving(true);
    try {
      await api.put(`/sites/${id}`, {
        name: site.name,
        slug: site.slug,
        domain: site.domain,
        published: site.published,
        settings: site.settings,
      });
      toast.success("Kaydedildi");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  // ---- card ops ----
  const saveCard = async () => {
    const d = cardDialog;
    try {
      if (d.mode === "new") {
        await api.post(`/sites/${id}/cards`, d.card);
        toast.success("Kolon eklendi");
      } else {
        await api.put(`/cards/${d.card.id}`, d.card);
        toast.success("Kolon güncellendi");
      }
      setCardDialog(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const deleteCard = async (cid) => {
    await api.delete(`/cards/${cid}`);
    toast.success("Kolon silindi");
    load();
  };

  const persistOrder = async (arr) => {
    setCards(arr);
    await api.put(`/sites/${id}/cards/reorder`, { ordered_ids: arr.map((c) => c.id) });
  };

  const onDrop = async () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const arr = [...cards];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(overIdx, 0, moved);
    setDragIdx(null);
    setOverIdx(null);
    await persistOrder(arr);
  };

  const toggleActive = async (c) => {
    await api.put(`/cards/${c.id}`, { ...c, active: !c.active });
    load();
  };

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const s = site.settings;
  const previewData = { name: site.name, settings: s, cards: cards.filter((c) => c.active) };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="border-b border-zinc-800 sticky top-0 bg-[#09090b]/90 backdrop-blur z-20">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400" data-testid="back-btn">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-display font-bold">{site.name}</h1>
              <p className="text-xs text-zinc-500">/site/{site.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/site/${site.slug}`} target="_blank" rel="noopener noreferrer"
               className="text-sm text-zinc-400 hover:text-white flex items-center gap-1" data-testid="preview-link">
              <Eye size={15} /> Önizle
            </a>
            <Button data-testid="save-site-btn" onClick={saveSite} disabled={saving} className="bg-amber-400 text-black hover:bg-amber-300 font-display font-bold">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} className="mr-1" /> Kaydet</>}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6 grid lg:grid-cols-[420px_1fr] gap-6">
        {/* ---- Controls ---- */}
        <div className="lg:h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin lg:pr-2">
          <Tabs defaultValue="appearance">
            <TabsList className="bg-zinc-900 border border-zinc-800 w-full grid grid-cols-3">
              <TabsTrigger value="appearance" data-testid="tab-appearance">Görünüm</TabsTrigger>
              <TabsTrigger value="cards" data-testid="tab-cards">Kolonlar</TabsTrigger>
              <TabsTrigger value="domain" data-testid="tab-domain">Domain</TabsTrigger>
            </TabsList>

            {/* Appearance */}
            <TabsContent value="appearance" className="space-y-5 mt-5">
              <div>
                <Label className="text-zinc-400 text-xs">Başlık</Label>
                <Input value={s.title} onChange={(e) => setS("title", e.target.value)} data-testid="set-title" className="mt-1.5 bg-zinc-950 border-zinc-800" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Alt Başlık</Label>
                <Input value={s.subtitle} onChange={(e) => setS("subtitle", e.target.value)} className="mt-1.5 bg-zinc-950 border-zinc-800" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Sekme Başlığı (tarayıcı sekmesinde görünür)</Label>
                <Input value={s.page_title || ""} onChange={(e) => setS("page_title", e.target.value)} data-testid="set-page-title" className="mt-1.5 bg-zinc-950 border-zinc-800" placeholder="Örn: Güncel Giriş - Bonuslar" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Logo (opsiyonel)</Label>
                <div className="mt-1.5">
                  <ImageUpload value={s.logo_url} onChange={(url) => setS("logo_url", url)} testid="site-logo-upload" label="Logo" />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Üst Başlık Alanı</p>
                    <p className="text-xs text-zinc-500">Başlık, logo ve butonları göster</p>
                  </div>
                  <Switch checked={s.show_header !== false} onCheckedChange={(v) => setS("show_header", v)} data-testid="set-show-header" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Alt Bilgi (Footer)</p>
                    <p className="text-xs text-zinc-500">Sayfa altındaki telif yazısı</p>
                  </div>
                  <Switch checked={s.show_footer !== false} onCheckedChange={(v) => setS("show_footer", v)} data-testid="set-show-footer" />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <Label className="text-zinc-400 text-xs">Arka Plan Tipi</Label>
                <Select value={s.background_type} onValueChange={(v) => setS("background_type", v)}>
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="set-bg-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="gradient">Gradyan</SelectItem>
                    <SelectItem value="color">Düz Renk</SelectItem>
                    <SelectItem value="image">Görsel</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2">
                  <p className="text-xs text-zinc-500 mb-1.5">Hazır Arka Planlar (tek tıkla uygula)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { src: "/backgrounds/casino.jpg", label: "Casino Salon" },
                      { src: "/backgrounds/casino-chips.jpg", label: "Chip & Kart" },
                      { src: "/backgrounds/casino-roulette.jpg", label: "Rulet Neon" },
                      { src: "/backgrounds/casino-gold.jpg", label: "Altın Işıltı" },
                    ].map((bg, i) => {
                      const active = s.background_type === "image" && s.background_image_url === bg.src;
                      return (
                        <button
                          key={bg.src}
                          type="button"
                          data-testid={i === 0 ? "preset-casino-bg" : `preset-bg-${i}`}
                          onClick={() => { setS("background_type", "image"); setS("background_image_url", bg.src); }}
                          className={`relative rounded-lg overflow-hidden border transition-colors ${active ? "border-amber-400 ring-1 ring-amber-400" : "border-zinc-800 hover:border-amber-400/60"}`}
                        >
                          <img src={bg.src} alt={bg.label} className="h-16 w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-zinc-200 py-0.5 text-center">{bg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {s.background_type === "color" && <Color label="Arka Plan Rengi" value={s.background_color} onChange={(v) => setS("background_color", v)} testid="set-bg-color" />}
              {s.background_type === "gradient" && (
                <div className="grid grid-cols-2 gap-3">
                  <Color label="Gradyan Başlangıç" value={s.gradient_from} onChange={(v) => setS("gradient_from", v)} />
                  <Color label="Gradyan Bitiş" value={s.gradient_to} onChange={(v) => setS("gradient_to", v)} />
                </div>
              )}
              {s.background_type === "image" && (
                <div>
                  <Label className="text-zinc-400 text-xs">Arka Plan Görseli</Label>
                  <div className="mt-1.5">
                    <ImageUpload value={s.background_image_url} onChange={(url) => setS("background_image_url", url)} testid="bg-upload" label="Arka Plan" />
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 text-xs">Kolon Sayısı</Label>
                  <span className="text-amber-400 font-bold text-sm">{s.columns}</span>
                </div>
                <Slider value={[s.columns]} min={2} max={6} step={1} onValueChange={([v]) => setS("columns", v)} className="mt-3" data-testid="set-columns" />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs">Kolon Boyutu</Label>
                <Select value={s.card_size} onValueChange={(v) => setS("card_size", v)}>
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="set-card-size"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="sm">Küçük</SelectItem>
                    <SelectItem value="md">Orta</SelectItem>
                    <SelectItem value="lg">Büyük</SelectItem>
                    <SelectItem value="custom">Özel (px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {s.card_size === "custom" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-400 text-xs">Özel Yükseklik</Label>
                    <span className="text-amber-400 font-bold text-sm">{s.card_height || 180}px</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider value={[s.card_height || 180]} min={80} max={500} step={10} onValueChange={([v]) => setS("card_height", v)} className="flex-1" data-testid="set-card-height" />
                    <Input type="number" value={s.card_height || 180} onChange={(e) => setS("card_height", Number(e.target.value) || 0)} className="w-20 bg-zinc-950 border-zinc-800 h-9" data-testid="set-card-height-input" />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-zinc-400 text-xs">Hareket Efekti (Animasyon)</Label>
                <Select value={s.animation || "none"} onValueChange={(v) => setS("animation", v)}>
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="set-animation"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="pulse">Nabız (büyüyüp küçülme)</SelectItem>
                    <SelectItem value="glow">Parıltı (glow)</SelectItem>
                    <SelectItem value="float">Yüzen (yukarı-aşağı)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 text-xs">Köşe Yuvarlaklığı</Label>
                  <span className="text-amber-400 font-bold text-sm">{s.card_radius}px</span>
                </div>
                <Slider value={[s.card_radius]} min={0} max={32} step={2} onValueChange={([v]) => setS("card_radius", v)} className="mt-3" />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                <Color label="Kolon Rengi" value={s.card_bg_color} onChange={(v) => setS("card_bg_color", v)} testid="set-card-bg" />
                <Color label="Yazı Rengi" value={s.card_text_color} onChange={(v) => setS("card_text_color", v)} />
                <Color label="Kolon Kenarlık" value={s.card_border_color} onChange={(v) => setS("card_border_color", v)} />
                <Color label="Vurgu Rengi" value={s.accent_color} onChange={(v) => setS("accent_color", v)} />
              </div>

              {/* Kenar stili */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <p className="text-sm font-medium text-amber-400">Kolon Kenar Süslemesi</p>
                <div>
                  <Label className="text-zinc-400 text-xs">Kenar Stili</Label>
                  <Select value={s.border_style || "solid"} onValueChange={(v) => setS("border_style", v)}>
                    <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="set-border-style"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="solid">Düz Çizgi</SelectItem>
                      <SelectItem value="neon">Neon (parlayan)</SelectItem>
                      <SelectItem value="gradient">Gradyan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-400 text-xs">Kenar Kalınlığı</Label>
                    <span className="text-amber-400 font-bold text-sm">{s.border_width ?? 2}px</span>
                  </div>
                  <Slider value={[s.border_width ?? 2]} min={0} max={8} step={1} onValueChange={([v]) => setS("border_width", v)} className="mt-3" />
                </div>
                {(s.border_style === "gradient") && (
                  <div className="grid grid-cols-2 gap-3">
                    <Color label="Gradyan Başlangıç" value={s.border_gradient_from} onChange={(v) => setS("border_gradient_from", v)} />
                    <Color label="Gradyan Bitiş" value={s.border_gradient_to} onChange={(v) => setS("border_gradient_to", v)} />
                  </div>
                )}
              </div>

              {/* Metin stili */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <p className="text-sm font-medium text-amber-400">Kolon Metni</p>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-400 text-xs">Yazı Boyutu</Label>
                    <span className="text-amber-400 font-bold text-sm">{s.card_font_size || 18}px</span>
                  </div>
                  <Slider value={[s.card_font_size || 18]} min={12} max={32} step={1} onValueChange={([v]) => setS("card_font_size", v)} className="mt-3" data-testid="set-font-size" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400 text-xs">Yazı Kalınlığı</Label>
                    <Select value={s.card_font_weight || "700"} onValueChange={(v) => setS("card_font_weight", v)}>
                      <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="400">Normal</SelectItem>
                        <SelectItem value="600">Yarı Kalın</SelectItem>
                        <SelectItem value="700">Kalın</SelectItem>
                        <SelectItem value="900">Çok Kalın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Harf Biçimi</Label>
                    <Select value={s.card_text_transform || "none"} onValueChange={(v) => setS("card_text_transform", v)}>
                      <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="none">Normal</SelectItem>
                        <SelectItem value="uppercase">BÜYÜK HARF</SelectItem>
                        <SelectItem value="capitalize">Baş Harf Büyük</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Header CTAs */}
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-zinc-400 text-xs">Üst Butonlar (CTA)</Label>
                  <button
                    data-testid="add-cta"
                    onClick={() => setS("header_ctas", [...(s.header_ctas || []), { label: "", url: "", color: "#FACC15" }])}
                    className="text-xs text-amber-400 flex items-center gap-1"
                  >
                    <Plus size={12} /> Ekle
                  </button>
                </div>
                <div className="space-y-3">
                  {(s.header_ctas || []).map((cta, i) => (
                    <div key={i} className="border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <Input value={cta.label} placeholder="Buton yazısı" onChange={(e) => { const a = [...s.header_ctas]; a[i] = { ...a[i], label: e.target.value }; setS("header_ctas", a); }} className="bg-zinc-950 border-zinc-800 text-xs h-8" />
                        <input type="color" value={cta.color} onChange={(e) => { const a = [...s.header_ctas]; a[i] = { ...a[i], color: e.target.value }; setS("header_ctas", a); }} className="h-8 w-10 rounded bg-transparent border border-zinc-800" />
                        <button onClick={() => setS("header_ctas", s.header_ctas.filter((_, x) => x !== i))} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                      <Input value={cta.url} placeholder="https://hedef-link" onChange={(e) => { const a = [...s.header_ctas]; a[i] = { ...a[i], url: e.target.value }; setS("header_ctas", a); }} className="bg-zinc-950 border-zinc-800 text-xs h-8" />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Cards */}
            <TabsContent value="cards" className="mt-5 space-y-3">
              <Button data-testid="add-card-btn" onClick={() => setCardDialog({ mode: "new", card: { ...emptyCard } })} className="w-full bg-amber-400 text-black hover:bg-amber-300 font-display font-bold">
                <Plus size={16} className="mr-1" /> Reklam Kolonu Ekle
              </Button>
              {cards.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Kolon yok.</p>}
              {cards.length > 1 && <p className="text-zinc-600 text-xs">Sıralamak için sürükleyip bırakın.</p>}
              {cards.map((c, idx) => (
                <div
                  key={c.id}
                  data-testid={`card-row-${idx}`}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragEnter={() => setOverIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={onDrop}
                  className={`border rounded-lg p-3 flex items-center gap-3 bg-zinc-900/40 transition-colors ${
                    overIdx === idx && dragIdx !== null && dragIdx !== idx ? "border-amber-400" : "border-zinc-800"
                  } ${dragIdx === idx ? "opacity-40" : ""}`}
                >
                  <span className="text-zinc-600 cursor-grab active:cursor-grabbing" data-testid={`card-drag-${idx}`}>
                    <GripVertical size={16} />
                  </span>
                  <div className="h-9 w-9 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: c.bg_color || s.card_bg_color, color: c.text_color || s.card_text_color }}>
                    {c.logo_url ? <img src={c.logo_url} alt="" className="max-h-8 max-w-8 object-contain" /> : "AD"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.title || "(başlıksız)"}</p>
                    <p className="text-xs text-zinc-500 truncate">{c.link || "link yok"} · {c.clicks} tık</p>
                  </div>
                  <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} data-testid={`card-active-${idx}`} />
                  <button onClick={() => setCardDialog({ mode: "edit", card: { ...c } })} className="text-zinc-400 hover:text-white" data-testid={`card-edit-${idx}`}><Pencil size={15} /></button>
                  <button onClick={() => deleteCard(c.id)} className="text-zinc-400 hover:text-red-400" data-testid={`card-delete-${idx}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </TabsContent>

            {/* Domain */}
            <TabsContent value="domain" className="mt-5 space-y-5">
              <div>
                <Label className="text-zinc-400 text-xs">Site Adı</Label>
                <Input value={site.name} onChange={(e) => setMeta("name", e.target.value)} data-testid="set-name" className="mt-1.5 bg-zinc-950 border-zinc-800" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Slug (önizleme adresi)</Label>
                <Input value={site.slug} onChange={(e) => setMeta("slug", e.target.value)} data-testid="set-slug" className="mt-1.5 bg-zinc-950 border-zinc-800" />
                <p className="text-xs text-zinc-600 mt-1">/site/{site.slug}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Özel Domain</Label>
                <Input value={site.domain} onChange={(e) => setMeta("domain", e.target.value)} data-testid="set-domain" className="mt-1.5 bg-zinc-950 border-zinc-800" placeholder="ornek.com" />
                <p className="text-xs text-zinc-600 mt-1">Domaininizin DNS'ini bu sunucuya yönlendirdikten sonra bu alandaki site otomatik gösterilir.</p>
              </div>
              <div className="flex items-center justify-between border border-zinc-800 rounded-lg p-4">
                <div>
                  <p className="font-medium text-sm">Yayın Durumu</p>
                  <p className="text-xs text-zinc-500">Kapalıyken site ziyaretçilere gösterilmez</p>
                </div>
                <Switch checked={site.published} onCheckedChange={(v) => setMeta("published", v)} data-testid="set-published" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Live preview ---- */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-black lg:h-[calc(100vh-6rem)] lg:sticky lg:top-[6rem]">
          <div className="h-9 border-b border-zinc-800 flex items-center px-4 gap-2 text-xs text-zinc-500 bg-zinc-900">
            <Eye size={13} /> Canlı Önizleme
          </div>
          <div className="h-[calc(100%-2.25rem)] overflow-y-auto scrollbar-thin" data-testid="live-preview">
            <PublicSiteRenderer data={previewData} previewMode />
          </div>
        </div>
      </div>

      {/* Card dialog */}
      <Dialog open={!!cardDialog} onOpenChange={(o) => !o && setCardDialog(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{cardDialog?.mode === "new" ? "Yeni Kolon" : "Kolonu Düzenle"}</DialogTitle>
          </DialogHeader>
          {cardDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-xs">Başlık / Teklif Metni</Label>
                <Textarea value={cardDialog.card.title} onChange={(e) => setCardDialog((p) => ({ ...p, card: { ...p.card, title: e.target.value } }))} data-testid="card-title-input" className="mt-1.5 bg-zinc-950 border-zinc-800" placeholder="1000₺ Yeni Üyelere Nakit!" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Hedef Link</Label>
                <Input value={cardDialog.card.link} onChange={(e) => setCardDialog((p) => ({ ...p, card: { ...p.card, link: e.target.value } }))} data-testid="card-link-input" className="mt-1.5 bg-zinc-950 border-zinc-800" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Logo</Label>
                <div className="mt-1.5">
                  <ImageUpload value={cardDialog.card.logo_url} onChange={(url) => setCardDialog((p) => ({ ...p, card: { ...p.card, logo_url: url } }))} testid="card-logo-upload" label="Logo" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Color label="Kolon Rengi" value={cardDialog.card.bg_color} onChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, bg_color: v } }))} />
                <Color label="Yazı Rengi" value={cardDialog.card.text_color} onChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, text_color: v } }))} />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Kenar Stili (bu kolon için)</Label>
                <Select
                  value={cardDialog.card.border_style || "inherit"}
                  onValueChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, border_style: v === "inherit" ? null : v } }))}
                >
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="card-border-style"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="inherit">Site ayarını kullan</SelectItem>
                    <SelectItem value="solid">Düz Çizgi</SelectItem>
                    <SelectItem value="neon">Neon (parlayan)</SelectItem>
                    <SelectItem value="gradient">Gradyan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(cardDialog.card.border_style === "solid" || cardDialog.card.border_style === "neon") && (
                <Color label="Kenar Rengi" value={cardDialog.card.border_color} onChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, border_color: v } }))} />
              )}
              {cardDialog.card.border_style === "gradient" && (
                <div className="grid grid-cols-2 gap-3">
                  <Color label="Gradyan Başlangıç" value={cardDialog.card.border_from} onChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, border_from: v } }))} />
                  <Color label="Gradyan Bitiş" value={cardDialog.card.border_to} onChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, border_to: v } }))} />
                </div>
              )}
              <div className="border-t border-zinc-800 pt-3">
                <Label className="text-zinc-400 text-xs">Köşe Rozeti (opsiyonel)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input value={cardDialog.card.badge_text || ""} onChange={(e) => setCardDialog((p) => ({ ...p, card: { ...p.card, badge_text: e.target.value } }))} data-testid="card-badge-text" className="bg-zinc-950 border-zinc-800" placeholder="YENİ / VIP / %100 BONUS" />
                  <input type="color" value={cardDialog.card.badge_color || "#FACC15"} onChange={(e) => setCardDialog((p) => ({ ...p, card: { ...p.card, badge_color: e.target.value } }))} className="h-9 w-11 rounded-md bg-transparent border border-zinc-800 shrink-0" title="Rozet rengi" />
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">Boş bırakırsan rozet görünmez.</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Hareket Efekti (bu kolon için)</Label>
                <Select
                  value={cardDialog.card.animation || "inherit"}
                  onValueChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, animation: v === "inherit" ? null : v } }))}
                >
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800" data-testid="card-animation"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="inherit">Site ayarını kullan</SelectItem>
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="pulse">Nabız</SelectItem>
                    <SelectItem value="glow">Parıltı</SelectItem>
                    <SelectItem value="float">Yüzen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Genişlik (kaç kolon kaplasın)</Label>
                <Select value={String(cardDialog.card.span)} onValueChange={(v) => setCardDialog((p) => ({ ...p, card: { ...p.card, span: Number(v) } }))}>
                  <SelectTrigger className="mt-1.5 bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button data-testid="save-card-btn" onClick={saveCard} className="bg-amber-400 text-black hover:bg-amber-300 font-display font-bold">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

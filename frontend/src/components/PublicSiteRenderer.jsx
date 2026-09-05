import { useEffect } from "react";
import { motion } from "framer-motion";
import { goUrl } from "@/lib/api";

function bgStyle(s) {
  if (!s) return { background: "#050508" };
  if (s.background_type === "image" && s.background_image_url) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${s.background_image_url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  }
  if (s.background_type === "gradient") {
    return { background: `linear-gradient(160deg, ${s.gradient_from || "#0b0b14"} 0%, ${s.gradient_to || "#050508"} 100%)` };
  }
  return { background: s.background_color || "#050508" };
}

const sizeMap = { sm: 130, md: 180, lg: 240 };

function AdCard({ c, s, minH }) {
  const accent = s.accent_color || "#FACC15";
  const cardBg = c.bg_color || s.card_bg_color || "#12121A";
  const cardText = c.text_color || s.card_text_color || "#FFFFFF";
  const radius = s.card_radius ?? 16;

  const bStyle = c.border_style || s.border_style || "solid";
  const bWidth = s.border_width ?? 2;
  const solidColor = c.border_color || s.card_border_color || accent;
  const gFrom = c.border_from || s.border_gradient_from || accent;
  const gTo = c.border_to || s.border_gradient_to || "#F97316";
  const glow = bStyle === "gradient" ? gFrom : solidColor;

  const isGradient = bStyle === "gradient";
  const isNeon = bStyle === "neon";

  const outerStyle = isGradient
    ? {
        background: `linear-gradient(135deg, ${gFrom}, ${gTo})`,
        padding: `${bWidth}px`,
        borderRadius: `${radius}px`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.4)`,
      }
    : {
        borderRadius: `${radius}px`,
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
      };

  const innerStyle = {
    backgroundColor: cardBg,
    color: cardText,
    borderRadius: `${isGradient ? Math.max(radius - bWidth, 0) : radius}px`,
    minHeight: minH,
    border: isGradient ? "none" : `${bWidth}px solid ${solidColor}`,
    boxShadow: isNeon ? `0 0 10px ${solidColor}99, inset 0 0 8px ${solidColor}55` : "inset 0 1px 0 rgba(255,255,255,0.04)",
    position: "relative",
  };

  const textStyle = {
    fontSize: `${s.card_font_size || 18}px`,
    fontWeight: s.card_font_weight || "700",
    textTransform: s.card_text_transform || "none",
    lineHeight: 1.2,
  };

  const badgeColor = c.badge_color || accent;

  return (
    <div
      className="ad-card h-full"
      style={outerStyle}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 12px 34px ${glow}55, 0 0 0 1px ${glow}, 0 0 22px ${glow}88`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)")}
    >
      <div className="h-full flex flex-col overflow-hidden" style={innerStyle}>
        {c.badge_text ? (
          <span className="card-badge" style={{ backgroundColor: badgeColor }}>{c.badge_text}</span>
        ) : null}
        {c.logo_url ? (
          <div className="flex-1 flex items-center justify-center p-3 min-h-[70px]">
            <img src={c.logo_url} alt="" className="max-h-full max-w-full object-contain" style={{ maxHeight: 120 }} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {c.title ? (
          <div
            className="w-full text-center px-3 py-3 font-display"
            style={{
              ...textStyle,
              borderTop: c.logo_url ? `1px solid ${(c.text_color || s.card_text_color || "#fff")}1a` : "none",
              background: c.logo_url ? "rgba(0,0,0,0.18)" : "transparent",
            }}
          >
            {c.title}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PublicSiteRenderer({ data, previewMode = false }) {
  const s = (data && data.settings) || {};

  useEffect(() => {
    if (previewMode || !data) return;
    const t = s.page_title || s.title || data.name;
    if (t) document.title = t;
  }, [data, s.page_title, s.title, previewMode]);

  if (!data) return null;
  const cards = data.cards || [];
  const accent = s.accent_color || "#FACC15";
  const minH = s.card_size === "custom" ? (s.card_height || 180) : (sizeMap[s.card_size] || 180);
  const showHeader = s.show_header !== false;
  const showFooter = s.show_footer !== false;

  return (
    <div className="min-h-screen w-full" style={bgStyle(s)}>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {showHeader && (
          <header className="flex flex-col items-center text-center gap-3 mb-8">
            {s.logo_url ? (
              <img src={s.logo_url} alt="logo" className="h-16 object-contain" data-testid="public-logo" />
            ) : null}
            <h1
              className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight"
              style={{ color: accent }}
              data-testid="public-title"
            >
              {s.title || "Güvenilir Siteler"}
            </h1>
            {s.subtitle ? <p className="text-sm sm:text-base text-zinc-300 max-w-xl">{s.subtitle}</p> : null}

            {(s.header_ctas || []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {(s.header_ctas || []).map((cta, i) =>
                  cta.label ? (
                    <a
                      key={i}
                      href={cta.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`public-cta-${i}`}
                      className="px-5 py-2.5 rounded-full font-display font-bold text-sm sm:text-base text-black shadow-lg hover:brightness-110 transition-[filter,transform] hover:scale-105"
                      style={{ backgroundColor: cta.color || accent }}
                    >
                      {cta.label}
                    </a>
                  ) : null
                )}
              </div>
            )}
          </header>
        )}

        {cards.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">Henüz reklam kolonu eklenmemiş.</div>
        ) : (
          <div className="ad-grid" style={{ "--cols": s.columns || 3 }}>
            {cards.map((c, idx) => {
              const anim = c.animation || s.animation || "none";
              const animClass = anim === "pulse" ? "anim-pulse" : anim === "glow" ? "anim-glow" : anim === "float" ? "anim-float" : "";
              const glowColor = c.border_color || c.border_from || s.card_border_color || accent;
              const content = previewMode ? (
                <div data-testid={`preview-card-${idx}`} className="h-full">
                  <AdCard c={c} s={s} minH={minH} />
                </div>
              ) : (
                <a
                  href={goUrl(c.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`sponsor-card-${idx}`}
                  className="block h-full"
                >
                  <AdCard c={c} s={s} minH={minH} />
                </a>
              );
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.5) }}
                  style={{ gridColumn: `span ${Math.min(c.span || 1, s.columns || 3)}` }}
                >
                  <div className={`anim-wrap ${animClass}`} style={{ "--glow": glowColor, borderRadius: `${s.card_radius ?? 16}px` }}>
                    {content}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {showFooter && (
          <footer className="text-center text-xs text-zinc-600 mt-12">
            © {new Date().getFullYear()} {data.name}
          </footer>
        )}
      </div>
    </div>
  );
}

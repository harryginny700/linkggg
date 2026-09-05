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

const sizeMap = { sm: 120, md: 160, lg: 210 };

export default function PublicSiteRenderer({ data, previewMode = false }) {
  if (!data) return null;
  const s = data.settings || {};
  const cards = data.cards || [];
  const accent = s.accent_color || "#FACC15";
  const minH = sizeMap[s.card_size] || 160;
  const showHeader = s.show_header !== false;
  const showFooter = s.show_footer !== false;

  return (
    <div className="min-h-screen w-full" style={bgStyle(s)}>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
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
          {s.subtitle ? (
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl">{s.subtitle}</p>
          ) : null}

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

        {/* Grid */}
        {cards.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">Henüz reklam kolonu eklenmemiş.</div>
        ) : (
          <div className="ad-grid" style={{ "--cols": s.columns || 3 }}>
            {cards.map((c, idx) => {
              const cardBg = c.bg_color || s.card_bg_color || "#12121A";
              const cardText = c.text_color || s.card_text_color || "#FFFFFF";
              const border = s.card_border_color || accent;
              const inner = (
                <div
                  className="ad-card h-full flex flex-col items-center justify-center gap-3 p-4 border"
                  style={{
                    backgroundColor: cardBg,
                    color: cardText,
                    borderColor: `${border}66`,
                    borderRadius: (s.card_radius ?? 16) + "px",
                    minHeight: minH,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 14px rgba(0,0,0,0.35)`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 10px 30px ${border}44, 0 0 0 1px ${border}`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)")}
                >
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="max-h-14 max-w-[80%] object-contain" />
                  ) : null}
                  <span className="font-display font-bold text-center leading-tight text-base sm:text-lg">
                    {c.title}
                  </span>
                </div>
              );
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.5) }}
                  style={{ gridColumn: `span ${Math.min(c.span || 1, s.columns || 3)}` }}
                >
                  {previewMode ? (
                    <div data-testid={`preview-card-${idx}`}>{inner}</div>
                  ) : (
                    <a
                      href={goUrl(c.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`sponsor-card-${idx}`}
                      className="block h-full"
                    >
                      {inner}
                    </a>
                  )}
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

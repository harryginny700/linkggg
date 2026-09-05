# PRD — Çok Siteli Link Reklam Platformu

## Original Problem Statement
burak13.com tarzı link reklam sitesi. Tek backoffice üzerinden birden çok tema/site yayınlama; her sitenin kolon sayısı, sıralama, boyut ve renklerini özelleştirme; site başına özel domain bağlama; her sitenin reklam kolonlarını (link, logo, teklif metni) ayrı ayrı yönetme; ekleyip çıkarma.

## User Choices
- Backoffice auth: JWT e-posta + şifre
- Özel domain bağlama mantığı (host'a göre site çözümleme)
- Tıklama istatistiği tutulup yönlendirme
- Public reklam sitesi arka planı: koyu casino/sahabet tarzı (site başına özelleştirilebilir)
- Ödeme yok, sadece link & kolon yönetimi

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT Bearer auth (localStorage). Koleksiyonlar: users, sites, cards.
- Frontend: React + Tailwind + shadcn/ui + framer-motion + sonner. Router: /, /site/:slug, /admin/login, /admin, /admin/sites/:id.
- Public çözümleme: /api/public/resolve (slug veya host). Tıklama: /api/go/{card_id} -> 302 + $inc clicks.

## Personas
- Owner/Admin (harryginny700@gmail.com): siteleri ve reklam kolonlarını yönetir.
- Ziyaretçi: public reklam sitesini görür, kartlara tıklar.

## Implemented (2026-06)
- JWT admin login + seed admin.
- Sites CRUD + publish toggle + domain binding + slug.
- Per-site appearance: başlık/alt başlık/logo, arka plan (gradyan/renk/görsel), kolon sayısı (2-6), kolon boyutu, köşe yuvarlaklığı, kolon/yazı/kenarlık/vurgu renkleri, üst CTA butonları.
- Ad cards CRUD per site: başlık, hedef link, logo, renkler, genişlik (span), aktif/pasif, sıralama (yukarı/aşağı), tıklama sayacı.
- Canlı önizleme paneli editörde.
- Public renderer + tıklama takibi + yönlendirme.
- Demo yayında site (slug=demo, 6 kolon).
- Tested: backend 9/9, frontend E2E 100%.

## Backlog
- P1: Sürükle-bırak kolon sıralama; kolon başına detaylı istatistik grafiği; logo yükleme (object storage).
- P2: Çoklu admin/rol; site şablon kopyalama; A/B rotasyon; SEO meta/favicon per site.

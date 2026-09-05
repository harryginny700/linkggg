# 🚀 DEPLOY.md — Kendi Sunucunuza Kurulum Rehberi

Bu rehber, Link Reklam Platformu'nu kendi VPS/sunucunuza kurup **tek backoffice'ten birden fazla siteyi farklı domainlerde** yayınlamanız için hazırlanmıştır.

Mimari: **React (frontend)** + **FastAPI (backend)** + **MongoDB**. Siteler, gelen **domain (Host)** bilgisine göre otomatik çözümlenir — yani birçok domaini tek uygulamaya bağlayabilirsiniz.

---

## 0. Gereksinimler

- Ubuntu 22.04+ (veya benzeri) bir VPS (min. 1GB RAM önerilir)
- Sunucunun bir **public IP** adresi
- Yönlendireceğiniz domainler (registrar paneline erişim)
- Sunucuya `root` veya `sudo` erişimi

---

## 1. Sistem Paketleri

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx python3-venv python3-pip
```

### Node.js (frontend build için) + Yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
```

---

## 2. MongoDB Kurulumu

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

Kontrol: `systemctl status mongod` → **active (running)** olmalı.

---

## 3. Proje Dosyaları

Projeyi sunucuya alın (GitHub'a pushladıysanız `git clone`, ya da dosyaları `scp` ile kopyalayın):

```bash
sudo mkdir -p /opt/linkads
sudo chown -R $USER:$USER /opt/linkads
cd /opt/linkads
git clone <REPO_URL> .        # veya dosyaları buraya kopyalayın
```

Beklenen yapı: `/opt/linkads/backend`, `/opt/linkads/frontend`

---

## 4. Backend (FastAPI) Kurulumu

```bash
cd /opt/linkads/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### `backend/.env` dosyasını düzenleyin
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="linkads_prod"
CORS_ORIGINS="*"
JWT_SECRET="BURAYA-UZUN-RASTGELE-GIZLI-ANAHTAR"
ADMIN_EMAIL="sizin@mail.com"
ADMIN_PASSWORD="guclu-bir-sifre"
EMERGENT_LLM_KEY="sk-emergent-..."   # logo yükleme (object storage) için
```

> ⚠️ `JWT_SECRET` için güçlü rastgele değer üretin: `openssl rand -hex 32`
>
> ℹ️ **Logo yükleme (object storage)** özelliği Emergent entegrasyon proxy'sini kullanır ve `EMERGENT_LLM_KEY` gerektirir. Kendi sunucunuzda bu servise erişiminiz yoksa, logoları harici bir görsel URL'i ile de girebilirsiniz; ya da bu kısmı yerel disk / S3 depolamaya çevirmek için bize söyleyin, uyarlayalım.

### Backend'i systemd servisi yapın
`/etc/systemd/system/linkads-backend.service`:
```ini
[Unit]
Description=LinkAds Backend
After=network.target mongod.service

[Service]
User=www-data
WorkingDirectory=/opt/linkads/backend
Environment="PATH=/opt/linkads/backend/venv/bin"
ExecStart=/opt/linkads/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /opt/linkads
sudo systemctl daemon-reload
sudo systemctl enable --now linkads-backend
sudo systemctl status linkads-backend    # active olmalı
```

Test: `curl http://127.0.0.1:8001/api/` → `{"message": "Link Reklam Platformu API"}`

---

## 5. Frontend (React) Build

`frontend/.env` dosyasını düzenleyin — **REACT_APP_BACKEND_URL, sitenizin ana adresi olmalı** (örn. ana yönetim domaininiz):
```env
REACT_APP_BACKEND_URL="https://panel.siteniz.com"
```

> Not: Frontend derleme sırasında bu değeri gömer. Tüm domainler aynı backend'e (aynı sunucu) gittiği için tek bir ana adres yeterlidir. Public sitelerin domain'e göre çözümlenmesi backend tarafında Host header ile yapılır; bu ayardan etkilenmez.

Build alın:
```bash
cd /opt/linkads/frontend
yarn install
yarn build
```

Çıktı `frontend/build` klasöründe oluşur. Nginx bunu statik olarak sunacak.

---

## 6. Nginx — Çoklu Domain Yönlendirme (EN ÖNEMLİ KISIM)

Tek bir sunucu bloğu **tüm domainleri** yakalar ve aynı uygulamaya yönlendirir. Yeni domain ekleyince nginx'e dokunmanıza gerek kalmaz — sadece backoffice'ten domaini siteye bağlarsınız.

`/etc/nginx/sites-available/linkads`:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;                       # TÜM domainleri yakalar

    root /opt/linkads/frontend/build;
    index index.html;

    # Yüklenen dosyalar + API -> backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React SPA - tüm yollar index.html'e
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/linkads /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. DNS — Domainleri Sunucuya Yönlendirme

Her domain için registrar (GoDaddy, Namecheap, Cloudflare vb.) panelinde:

| Type | Name | Value              | TTL  |
|------|------|--------------------|------|
| A    | @    | SUNUCU_IP_ADRESI   | 3600 |
| A    | www  | SUNUCU_IP_ADRESI   | 3600 |

Yönetim panelinize erişmek istediğiniz `panel.siteniz.com` için de aynı IP'ye A kaydı ekleyin.

> Tüm domainler **aynı IP'ye** gider — nginx `default_server` hepsini yakalar, backend Host'a göre doğru siteyi gösterir.

---

## 8. HTTPS / SSL

### Seçenek A — Certbot (nginx ile, domain başına)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d panel.siteniz.com -d site1.com -d www.site1.com -d site2.com
```
Her yeni domain eklediğinizde `certbot --nginx -d yenidomain.com` komutunu tekrar çalıştırın. Otomatik yenilenir.

### Seçenek B — Caddy (otomatik SSL, önerilir)
Çok sayıda domain bağlayacaksanız Caddy sertifikaları otomatik alır/yeniler. Nginx yerine Caddy kullanmak isterseniz `Caddyfile`:
```
{
    email sizin@mail.com
}
:443 {
    root * /opt/linkads/frontend/build
    file_server
    @api path /api/*
    reverse_proxy @api 127.0.0.1:8001
    try_files {path} /index.html
    tls { on_demand }        # yeni domainler için otomatik sertifika
}
```

---

## 9. Kullanım — Site ve Domain Bağlama

1. `https://panel.siteniz.com/admin/login` → giriş yapın (`.env`'deki ADMIN bilgileri).
2. **Yeni Site** oluşturun, görünüm + kolonları ayarlayın.
3. **Domain** sekmesine o siteye bağlamak istediğiniz domaini yazın (örn. `site1.com`).
4. Yayın anahtarını açın → **Kaydet**.
5. DNS + SSL hazırsa, `https://site1.com` adresine giren ziyaretçi o siteyi görür. 🎉

Yeni domain eklemek için tek yapmanız gereken: DNS A kaydı + (certbot kullanıyorsanız) SSL komutu + backoffice'ten domaini siteye bağlamak.

---

## 10. Güncelleme / Bakım

```bash
cd /opt/linkads && git pull
# backend değiştiyse:
sudo systemctl restart linkads-backend
# frontend değiştiyse:
cd frontend && yarn build && sudo systemctl reload nginx
```

Loglar:
```bash
sudo journalctl -u linkads-backend -f      # backend
sudo tail -f /var/log/nginx/error.log      # nginx
```

---

## Sık Sorulanlar

**S: Kaç domain bağlayabilirim?**  Sınırsız. Hepsi aynı IP'ye gelir, backend Host'a göre çözer.

**S: Bir domaine giriyorum ama site açılmıyor?**  Kontrol edin: (1) DNS A kaydı doğru IP'yi gösteriyor mu (`dig site1.com`), (2) o domain backoffice'te bir siteye bağlı ve **yayında** mı, (3) SSL sertifikası domaini kapsıyor mu.

**S: Logo yükleme çalışmıyor.**  Object storage Emergent proxy'sine bağlıdır; kendi sunucunuzda erişilemiyorsa harici görsel URL kullanın veya yerel/S3 depolamaya çevirtmek için talep edin.

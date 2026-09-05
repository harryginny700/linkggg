from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import jwt
import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    token = None
    if creds:
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Kimlik doğrulanmadı")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class HeaderCTA(BaseModel):
    label: str = ""
    url: str = ""
    color: str = "#FACC15"


class SiteSettings(BaseModel):
    title: str = "Güvenilir Siteler"
    subtitle: str = ""
    logo_url: str = ""
    background_type: str = "gradient"  # color | image | gradient
    background_color: str = "#050508"
    background_image_url: str = ""
    gradient_from: str = "#0b0b14"
    gradient_to: str = "#050508"
    columns: int = 3
    card_bg_color: str = "#12121A"
    card_text_color: str = "#FFFFFF"
    card_border_color: str = "#FACC15"
    accent_color: str = "#FACC15"
    card_radius: int = 16
    card_size: str = "md"  # sm | md | lg
    header_ctas: List[HeaderCTA] = Field(default_factory=list)


class SiteCreate(BaseModel):
    name: str
    slug: Optional[str] = None


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    domain: Optional[str] = None
    published: Optional[bool] = None
    settings: Optional[SiteSettings] = None


class CardInput(BaseModel):
    logo_url: str = ""
    title: str = ""
    link: str = ""
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    span: int = 1  # column span for size control
    active: bool = True


def slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    repl = {"ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u"}
    for k, v in repl.items():
        text = text.replace(k, v)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or new_id()[:8]


def public_site_payload(site: dict, cards: list) -> dict:
    return {
        "id": site["id"],
        "name": site["name"],
        "slug": site["slug"],
        "domain": site.get("domain", ""),
        "published": site.get("published", False),
        "settings": site.get("settings", {}),
        "cards": [
            {
                "id": c["id"],
                "logo_url": c.get("logo_url", ""),
                "title": c.get("title", ""),
                "link": c.get("link", ""),
                "bg_color": c.get("bg_color"),
                "text_color": c.get("text_color"),
                "span": c.get("span", 1),
                "clicks": c.get("clicks", 0),
            }
            for c in cards
        ],
    }


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    token = create_access_token(user["id"], user["email"])
    return {
        "access_token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")},
    }


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ---------------------------------------------------------------------------
# Sites (admin)
# ---------------------------------------------------------------------------
@api_router.get("/sites")
async def list_sites(current=Depends(get_current_user)):
    sites = await db.sites.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for s in sites:
        s["card_count"] = await db.cards.count_documents({"site_id": s["id"]})
        agg = await db.cards.aggregate([
            {"$match": {"site_id": s["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$clicks"}}},
        ]).to_list(1)
        s["total_clicks"] = agg[0]["total"] if agg else 0
    return sites


@api_router.post("/sites")
async def create_site(data: SiteCreate, current=Depends(get_current_user)):
    slug = slugify(data.slug or data.name)
    if await db.sites.find_one({"slug": slug}):
        slug = f"{slug}-{new_id()[:4]}"
    site = {
        "id": new_id(),
        "name": data.name,
        "slug": slug,
        "domain": "",
        "published": False,
        "settings": SiteSettings().model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.sites.insert_one(site)
    site.pop("_id", None)
    return site


@api_router.get("/sites/{site_id}")
async def get_site(site_id: str, current=Depends(get_current_user)):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site bulunamadı")
    cards = await db.cards.find({"site_id": site_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return {"site": site, "cards": cards}


@api_router.put("/sites/{site_id}")
async def update_site(site_id: str, data: SiteUpdate, current=Depends(get_current_user)):
    site = await db.sites.find_one({"id": site_id})
    if not site:
        raise HTTPException(status_code=404, detail="Site bulunamadı")
    update = {}
    if data.name is not None:
        update["name"] = data.name
    if data.slug is not None:
        slug = slugify(data.slug)
        existing = await db.sites.find_one({"slug": slug, "id": {"$ne": site_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Bu slug zaten kullanımda")
        update["slug"] = slug
    if data.domain is not None:
        domain = data.domain.lower().strip().replace("https://", "").replace("http://", "").strip("/")
        if domain:
            existing = await db.sites.find_one({"domain": domain, "id": {"$ne": site_id}})
            if existing:
                raise HTTPException(status_code=400, detail="Bu domain başka bir siteye bağlı")
        update["domain"] = domain
    if data.published is not None:
        update["published"] = data.published
    if data.settings is not None:
        update["settings"] = data.settings.model_dump()
    update["updated_at"] = now_iso()
    await db.sites.update_one({"id": site_id}, {"$set": update})
    updated = await db.sites.find_one({"id": site_id}, {"_id": 0})
    return updated


@api_router.delete("/sites/{site_id}")
async def delete_site(site_id: str, current=Depends(get_current_user)):
    await db.cards.delete_many({"site_id": site_id})
    res = await db.sites.delete_one({"id": site_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Site bulunamadı")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Cards (admin)
# ---------------------------------------------------------------------------
@api_router.get("/sites/{site_id}/cards")
async def list_cards(site_id: str, current=Depends(get_current_user)):
    cards = await db.cards.find({"site_id": site_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return cards


@api_router.post("/sites/{site_id}/cards")
async def create_card(site_id: str, data: CardInput, current=Depends(get_current_user)):
    if not await db.sites.find_one({"id": site_id}):
        raise HTTPException(status_code=404, detail="Site bulunamadı")
    count = await db.cards.count_documents({"site_id": site_id})
    card = {
        "id": new_id(),
        "site_id": site_id,
        "logo_url": data.logo_url,
        "title": data.title,
        "link": data.link,
        "bg_color": data.bg_color,
        "text_color": data.text_color,
        "span": data.span,
        "active": data.active,
        "clicks": 0,
        "order": count,
        "created_at": now_iso(),
    }
    await db.cards.insert_one(card)
    card.pop("_id", None)
    return card


@api_router.put("/cards/{card_id}")
async def update_card(card_id: str, data: CardInput, current=Depends(get_current_user)):
    res = await db.cards.update_one({"id": card_id}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kart bulunamadı")
    return await db.cards.find_one({"id": card_id}, {"_id": 0})


@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, current=Depends(get_current_user)):
    res = await db.cards.delete_one({"id": card_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kart bulunamadı")
    return {"ok": True}


class ReorderInput(BaseModel):
    ordered_ids: List[str]


@api_router.put("/sites/{site_id}/cards/reorder")
async def reorder_cards(site_id: str, data: ReorderInput, current=Depends(get_current_user)):
    for idx, cid in enumerate(data.ordered_ids):
        await db.cards.update_one({"id": cid, "site_id": site_id}, {"$set": {"order": idx}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
@api_router.get("/public/resolve")
async def resolve_site(request: Request, host: Optional[str] = None, slug: Optional[str] = None):
    site = None
    if slug:
        site = await db.sites.find_one({"slug": slug}, {"_id": 0})
    elif host:
        host = host.lower().strip()
        site = await db.sites.find_one({"domain": host}, {"_id": 0})
    if not site or not site.get("published"):
        raise HTTPException(status_code=404, detail="Yayında site bulunamadı")
    cards = await db.cards.find({"site_id": site["id"], "active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return public_site_payload(site, cards)


@api_router.get("/public/sites")
async def public_published_sites():
    sites = await db.sites.find({"published": True}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "settings": 1, "domain": 1}).to_list(200)
    return sites


@api_router.get("/go/{card_id}")
async def go(card_id: str):
    card = await db.cards.find_one({"id": card_id})
    if not card or not card.get("link"):
        raise HTTPException(status_code=404, detail="Bağlantı bulunamadı")
    await db.cards.update_one({"id": card_id}, {"$inc": {"clicks": 1}})
    return RedirectResponse(url=card["link"], status_code=302)


@api_router.get("/")
async def root():
    return {"message": "Link Reklam Platformu API"}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": email,
            "password_hash": hash_password(password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Admin kullanıcı oluşturuldu: %s", email)
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def seed_demo():
    if await db.sites.count_documents({}) > 0:
        return
    site_id = new_id()
    settings = SiteSettings(
        title="Güvenilir Siteler",
        subtitle="Güncel bonus ve giriş linkleri",
        columns=3,
        header_ctas=[
            HeaderCTA(label="20.000₺ NAKİT İÇİN TIKLA", url="https://example.com/kampanya", color="#22C55E"),
            HeaderCTA(label="REKLAM VE İŞBİRLİĞİ", url="https://t.me/example", color="#FACC15"),
        ],
    ).model_dump()
    await db.sites.insert_one({
        "id": site_id,
        "name": "Demo Reklam Sitesi",
        "slug": "demo",
        "domain": "",
        "published": True,
        "settings": settings,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    demo = [
        ("TIPOBET", "2000₺ DENEME BONUSU", "#facc15"),
        ("SAHABET", "1000₺ Yeni Üyelere Nakit!", "#22c55e"),
        ("ONWIN", "1000₺ Yeni Üyelere Nakit!", "#3b82f6"),
        ("BETXMEN", "%100 YATIRIM %100 İADE", "#ef4444"),
        ("MULTIWIN", "1500₺ Yeni Üyelere Nakit", "#a855f7"),
        ("BETTILT", "%300 Hoşgeldin Nakit", "#f97316"),
    ]
    for i, (name, offer, color) in enumerate(demo):
        await db.cards.insert_one({
            "id": new_id(),
            "site_id": site_id,
            "logo_url": "",
            "title": offer,
            "link": "https://example.com",
            "bg_color": "#12121A",
            "text_color": "#FFFFFF",
            "span": 1,
            "active": True,
            "clicks": 0,
            "order": i,
            "created_at": now_iso(),
            "brand": name,
        })


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.sites.create_index("slug", unique=True)
    await db.sites.create_index("domain")
    await db.cards.create_index("site_id")
    await seed_admin()
    await seed_demo()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

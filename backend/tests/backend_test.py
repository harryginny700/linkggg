"""Backend tests for Link Advertising Platform."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://multi-domain-ads.preview.emergentagent.com"
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "harryginny700@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["access_token"]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Auth ----
def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_sites_requires_auth():
    r = requests.get(f"{API}/sites")
    assert r.status_code == 401


def test_me(auth):
    r = requests.get(f"{API}/auth/me", headers=auth)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---- Sites ----
def test_list_sites_and_demo_exists(auth):
    r = requests.get(f"{API}/sites", headers=auth)
    assert r.status_code == 200
    sites = r.json()
    demo = next((s for s in sites if s["slug"] == "demo"), None)
    assert demo is not None, "Seeded demo site missing"
    assert demo["published"] is True
    assert demo["card_count"] == 6


def test_public_resolve_demo():
    r = requests.get(f"{API}/public/resolve", params={"slug": "demo"})
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "demo"
    assert len(data["cards"]) == 6
    assert data["settings"]["title"] == "Güvenilir Siteler"


def test_public_resolve_unknown():
    r = requests.get(f"{API}/public/resolve", params={"slug": "nope-xyz"})
    assert r.status_code == 404


def test_public_sites_list():
    r = requests.get(f"{API}/public/sites")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---- CRUD site + cards + go ----
def test_full_site_lifecycle(auth):
    # Create
    ts = int(time.time())
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_Site_{ts}"})
    assert r.status_code == 200, r.text
    site = r.json()
    sid = site["id"]
    assert site["published"] is False
    assert site["slug"].startswith("test-site")

    # Get
    r = requests.get(f"{API}/sites/{sid}", headers=auth)
    assert r.status_code == 200
    assert r.json()["site"]["id"] == sid

    # Update settings/domain/slug/publish
    r = requests.put(f"{API}/sites/{sid}", headers=auth, json={
        "name": f"TEST_Renamed_{ts}",
        "published": True,
        "settings": {"title": "New Title", "columns": 4},
    })
    assert r.status_code == 200
    assert r.json()["published"] is True
    assert r.json()["settings"]["title"] == "New Title"

    # Create cards
    card_ids = []
    for i in range(3):
        r = requests.post(f"{API}/sites/{sid}/cards", headers=auth, json={
            "title": f"Card {i}", "link": "https://example.com/x", "span": 1, "active": True,
        })
        assert r.status_code == 200, r.text
        card_ids.append(r.json()["id"])

    # Update card
    r = requests.put(f"{API}/cards/{card_ids[0]}", headers=auth, json={
        "title": "Updated", "link": "https://example.com/y", "span": 2, "active": True,
    })
    assert r.status_code == 200
    assert r.json()["title"] == "Updated"

    # Reorder
    reversed_ids = list(reversed(card_ids))
    r = requests.put(f"{API}/sites/{sid}/cards/reorder", headers=auth, json={"ordered_ids": reversed_ids})
    assert r.status_code == 200
    r = requests.get(f"{API}/sites/{sid}/cards", headers=auth)
    got_order = [c["id"] for c in r.json()]
    assert got_order == reversed_ids

    # Click redirect increments count
    cid = card_ids[1]
    r = requests.get(f"{API}/go/{cid}", allow_redirects=False)
    assert r.status_code == 302
    assert "example.com" in r.headers.get("location", "")
    r = requests.get(f"{API}/sites/{sid}/cards", headers=auth)
    click_map = {c["id"]: c["clicks"] for c in r.json()}
    assert click_map[cid] >= 1

    # Public resolve for published new site
    r = requests.get(f"{API}/public/resolve", params={"slug": r.json()[0]["site_id"] if False else "test-renamed-" + str(ts)})
    # slug was renamed; fetch site to get slug
    r2 = requests.get(f"{API}/sites/{sid}", headers=auth)
    slug = r2.json()["site"]["slug"]
    r = requests.get(f"{API}/public/resolve", params={"slug": slug})
    assert r.status_code == 200
    assert len(r.json()["cards"]) == 3

    # Delete card
    r = requests.delete(f"{API}/cards/{card_ids[2]}", headers=auth)
    assert r.status_code == 200

    # Delete site cascades
    r = requests.delete(f"{API}/sites/{sid}", headers=auth)
    assert r.status_code == 200
    r = requests.get(f"{API}/sites/{sid}", headers=auth)
    assert r.status_code == 404


def test_duplicate_slug(auth):
    r = requests.put(f"{API}/sites/nonexistent", headers=auth, json={"slug": "demo"})
    assert r.status_code == 404


# ---- Upload / Files / Duplicate (iteration 2) ----
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x5b\x8e\xdc\xa4"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_upload_requires_auth():
    r = requests.post(f"{API}/upload", files={"file": ("t.png", PNG_BYTES, "image/png")})
    assert r.status_code == 401


def test_upload_and_serve(auth):
    r = requests.post(
        f"{API}/upload",
        headers=auth,
        files={"file": ("TEST_pixel.png", PNG_BYTES, "image/png")},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "path" in data and "url" in data
    assert data["url"].startswith("/api/files/")
    # public serve, no auth
    r2 = requests.get(f"{BASE_URL}{data['url']}")
    assert r2.status_code == 200
    assert r2.headers.get("content-type", "").startswith("image/")
    assert len(r2.content) > 0


def test_upload_rejects_non_image(auth):
    r = requests.post(f"{API}/upload", headers=auth, files={"file": ("t.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_duplicate_site(auth):
    # Create source with 2 cards
    ts = int(time.time())
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_Src_{ts}"})
    sid = r.json()["id"]
    for i in range(2):
        requests.post(f"{API}/sites/{sid}/cards", headers=auth,
                      json={"title": f"C{i}", "link": "https://example.com", "span": 1, "active": True})
    # bump a click on first card so we can verify reset
    cards = requests.get(f"{API}/sites/{sid}/cards", headers=auth).json()
    requests.get(f"{API}/go/{cards[0]['id']}", allow_redirects=False)

    r = requests.post(f"{API}/sites/{sid}/duplicate", headers=auth)
    assert r.status_code == 200, r.text
    new_site = r.json()
    assert new_site["name"].endswith("(Kopya)")
    assert new_site["published"] is False
    assert new_site["domain"] == ""
    assert new_site["slug"] != cards[0].get("slug")
    new_sid = new_site["id"]

    # Verify cards copied with clicks reset
    new_cards = requests.get(f"{API}/sites/{new_sid}/cards", headers=auth).json()
    assert len(new_cards) == 2
    assert all(c["clicks"] == 0 for c in new_cards)
    assert {c["title"] for c in new_cards} == {"C0", "C1"}

    # Cleanup
    requests.delete(f"{API}/sites/{sid}", headers=auth)
    requests.delete(f"{API}/sites/{new_sid}", headers=auth)


def test_duplicate_requires_auth():
    r = requests.post(f"{API}/sites/anything/duplicate")
    assert r.status_code == 401


def test_duplicate_not_found(auth):
    r = requests.post(f"{API}/sites/nope-xyz/duplicate", headers=auth)
    assert r.status_code == 404


# ---- Domain normalization + resolve by Host (iteration 3) ----
def test_domain_normalize_save_and_resolve_variants(auth):
    ts = int(time.time())
    domain = f"testdayko{ts}.com"
    # Create site
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_Dom_{ts}"})
    assert r.status_code == 200
    sid = r.json()["id"]
    # Save domain with messy input
    r = requests.put(f"{API}/sites/{sid}", headers=auth,
                     json={"domain": f"https://www.{domain.upper()}/", "published": True,
                           "settings": {"show_header": False, "show_footer": False}})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["domain"] == domain, f"expected normalized {domain}, got {body['domain']}"
    assert body["settings"]["show_header"] is False
    assert body["settings"]["show_footer"] is False

    # Add a card so payload has content
    requests.post(f"{API}/sites/{sid}/cards", headers=auth,
                  json={"title": "AD", "link": "https://example.com", "span": 1, "active": True})

    # Variants should all resolve
    for host_variant in [domain, f"www.{domain}", domain.upper(),
                          f"https://{domain}/", f"{domain}:443"]:
        r = requests.get(f"{API}/public/resolve", params={"host": host_variant})
        assert r.status_code == 200, f"variant {host_variant!r} -> {r.status_code} {r.text}"
        d = r.json()
        assert d["id"] == sid
        assert d["settings"]["show_header"] is False
        assert d["settings"]["show_footer"] is False
        assert len(d["cards"]) == 1

    # Unknown host returns 404
    r = requests.get(f"{API}/public/resolve", params={"host": f"random-nope-{ts}.com"})
    assert r.status_code == 404

    # Binding same domain to a second site -> 400
    r2 = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_Dom2_{ts}"})
    sid2 = r2.json()["id"]
    r = requests.put(f"{API}/sites/{sid2}", headers=auth, json={"domain": domain})
    assert r.status_code == 400, r.text

    # Cleanup
    requests.delete(f"{API}/sites/{sid}", headers=auth)
    requests.delete(f"{API}/sites/{sid2}", headers=auth)


def test_show_header_footer_defaults_true():
    # Demo site should have defaults True (no explicit setting saved before this iter)
    r = requests.get(f"{API}/public/resolve", params={"slug": "demo"})
    assert r.status_code == 200
    s = r.json()["settings"]
    # keys may or may not exist; if missing PublicSiteRenderer treats as true.
    assert s.get("show_header", True) is True
    assert s.get("show_footer", True) is True



# ---- New feature: page_title, border/text styling, per-card overrides, casino bg (iteration 4) ----
def test_casino_background_asset_reachable():
    r = requests.get(f"{BASE_URL}/backgrounds/casino.jpg")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 1000


def test_new_site_defaults_casino_bg_and_style(auth):
    ts = int(time.time())
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_Defaults_{ts}"})
    assert r.status_code == 200
    sid = r.json()["id"]
    try:
        s = requests.get(f"{API}/sites/{sid}", headers=auth).json()["site"]["settings"]
        assert s.get("background_type") == "image"
        assert s.get("background_image_url") == "/backgrounds/casino.jpg"
        assert s.get("border_style") == "solid"
        assert s.get("border_width") == 2
        assert s.get("card_font_size") == 18
        assert s.get("card_font_weight") == "700"
        assert s.get("card_text_transform") == "none"
        assert s.get("page_title", "") == ""
    finally:
        requests.delete(f"{API}/sites/{sid}", headers=auth)


def test_page_title_and_style_persist_and_public_resolve(auth):
    ts = int(time.time())
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_PT_{ts}"})
    sid = r.json()["id"]
    try:
        payload = {
            "published": True,
            "settings": {
                "page_title": "DAYKO - Güncel Giriş",
                "border_style": "gradient",
                "border_width": 6,
                "border_gradient_from": "#FF0080",
                "border_gradient_to": "#7928CA",
                "card_font_size": 22,
                "card_font_weight": "900",
                "card_text_transform": "uppercase",
            },
        }
        r = requests.put(f"{API}/sites/{sid}", headers=auth, json=payload)
        assert r.status_code == 200, r.text
        s = r.json()["settings"]
        assert s["page_title"] == "DAYKO - Güncel Giriş"
        assert s["border_style"] == "gradient"
        assert s["border_width"] == 6
        assert s["border_gradient_from"] == "#FF0080"
        assert s["border_gradient_to"] == "#7928CA"
        assert s["card_font_size"] == 22
        assert s["card_font_weight"] == "900"
        assert s["card_text_transform"] == "uppercase"

        # Public resolve returns these
        slug = requests.get(f"{API}/sites/{sid}", headers=auth).json()["site"]["slug"]
        r = requests.get(f"{API}/public/resolve", params={"slug": slug})
        assert r.status_code == 200
        ps = r.json()["settings"]
        assert ps["page_title"] == "DAYKO - Güncel Giriş"
        assert ps["border_style"] == "gradient"
        assert ps["card_text_transform"] == "uppercase"
    finally:
        requests.delete(f"{API}/sites/{sid}", headers=auth)


def test_card_border_override_persists_and_public(auth):
    ts = int(time.time())
    r = requests.post(f"{API}/sites", headers=auth, json={"name": f"TEST_CardBorder_{ts}"})
    sid = r.json()["id"]
    try:
        requests.put(f"{API}/sites/{sid}", headers=auth, json={"published": True})
        # Create card with border override (neon)
        r = requests.post(f"{API}/sites/{sid}/cards", headers=auth, json={
            "title": "Neon Card",
            "link": "https://example.com/n",
            "span": 1,
            "active": True,
            "logo_url": "/api/files/test.png",
            "border_style": "neon",
            "border_color": "#00FFEA",
        })
        assert r.status_code == 200, r.text
        c1 = r.json()
        assert c1["border_style"] == "neon"
        assert c1["border_color"] == "#00FFEA"

        # Create + update to gradient
        r = requests.post(f"{API}/sites/{sid}/cards", headers=auth, json={
            "title": "Grad Card", "link": "https://example.com/g", "span": 1, "active": True,
        })
        cid = r.json()["id"]
        r = requests.put(f"{API}/cards/{cid}", headers=auth, json={
            "title": "Grad Card", "link": "https://example.com/g", "span": 1, "active": True,
            "border_style": "gradient", "border_from": "#111111", "border_to": "#EEEEEE",
        })
        assert r.status_code == 200
        c2 = r.json()
        assert c2["border_style"] == "gradient"
        assert c2["border_from"] == "#111111"
        assert c2["border_to"] == "#EEEEEE"

        # Public resolve exposes new fields
        slug = requests.get(f"{API}/sites/{sid}", headers=auth).json()["site"]["slug"]
        r = requests.get(f"{API}/public/resolve", params={"slug": slug})
        assert r.status_code == 200
        cards = r.json()["cards"]
        by_title = {c["title"]: c for c in cards}
        assert by_title["Neon Card"]["border_style"] == "neon"
        assert by_title["Neon Card"]["border_color"] == "#00FFEA"
        assert by_title["Grad Card"]["border_style"] == "gradient"
        assert by_title["Grad Card"]["border_from"] == "#111111"
        assert by_title["Grad Card"]["border_to"] == "#EEEEEE"
    finally:
        requests.delete(f"{API}/sites/{sid}", headers=auth)

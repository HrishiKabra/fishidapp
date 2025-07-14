# fish_meta.py  – FishBase + Wikipedia + LLM visual cues
import time, urllib.parse as up, shelve, os, requests

FB_URL = "https://fishbase.ropensci.org/species?Scientific_Name="
WP_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/"
TTL    = 24 * 3600                         # refresh cache daily
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY      = os.getenv("GROQ_API_KEY")  # set in .env & Render

# ---------- helper: FishBase ----------
def _from_fishbase(name):
    try:
        j = requests.get(FB_URL + up.quote(name), timeout=15).json()
        d = j["data"][0]
        return {
            "common_name":   d.get("FBname") or d.get("EnglishName"),
            "habitat":       d.get("Habitat"),
            "distribution":  d.get("Distribution"),
            "max_length_cm": d.get("Length"),
            "picture":       d.get("Image"),
        }
    except Exception:
        return {}

# ---------- helper: Wikipedia ----------
def _from_wiki(name):
    r = requests.get(WP_URL + up.quote(name.replace(" ", "_")), timeout=15)
    if r.status_code == 200:
        j = r.json()
        return {
            "intro":   j.get("extract"),
            "picture": j.get("thumbnail", {}).get("source"),
        }
    return {}

# ---------- helper: one-shot LLM for visual cues ----------
def _visual_cues(name):
    if not GROQ_KEY:
        return ""

    prompt = (f"List three distinctive visual features (colour, shape, markings) "
              f"that help a snorkeller distinguish the fish species {name} "
              f"from other reef fish. Bullet points, max 40 words total.")

    body = {
        "model": "llama3-70b-8192",
        "messages": [
            {"role": "system", "content": "You are a concise ichthyology assistant."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 80,
        "temperature": 0.7,
    }

    r = requests.post(
        GROQ_ENDPOINT,
        json=body,
        timeout=20,
        headers={"Authorization": f"Bearer {GROQ_KEY}"}
    )
    if r.status_code == 200:
        return r.json()["choices"][0]["message"]["content"].strip()
    return ""

# ---------- public: get(name) ----------
def get(name: str) -> dict:
    """
    Merge FishBase + Wikipedia + cached LLM cues.
    Returns a dict (may contain keys: common_name, intro, habitat,
    distribution, max_length_cm, picture, visual_cues).
    """
    with shelve.open("fish_cache") as db:
        rec = db.get(name)
        fresh = rec and (time.time() - rec["_ts"] < TTL)

        if not fresh:
            rec = _from_fishbase(name) | _from_wiki(name)
            rec["_ts"] = time.time()

        # add visual_cues once per species
        if "visual_cues" not in rec:
            rec["visual_cues"] = _visual_cues(name)

        db[name] = rec
        return rec

"""
fish_meta.py – FishBase • Wikipedia • Groq (visual cues & fun fact)
Adds a special call  get("_list")  → full scientific-name catalog (cached).
"""
from __future__ import annotations
import os, time, urllib.parse as up, shelve, requests, json, importlib.resources

CACHE_S   = 24*3600
FB_URL    = "https://fishbase.ropensci.org/species?Scientific_Name="
WP_URL    = "https://en.wikipedia.org/api/rest_v1/page/summary/"
GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY  = os.getenv("GROQ_API_KEY")

# ---------- helpers (unchanged) ----------
def _fishbase(name):
    try:
        d = requests.get(FB_URL+up.quote(name),timeout=15).json()["data"][0]
        return {"common_name":d.get("FBname") or d.get("EnglishName"),
                "habitat":d.get("Habitat"),
                "distribution":d.get("Distribution"),
                "max_length_cm":d.get("Length"),
                "picture":d.get("Image")}
    except Exception: return {}

def _wiki(name):
    r = requests.get(WP_URL+up.quote(name.replace(" ","_")),timeout=15)
    if r.status_code!=200: return {}
    j = r.json(); status=""
    if "description" in j and "IUCN" in j["description"]:
        status=j["description"].split("(")[-1].strip(")")
    return {"intro":j.get("extract"),
            "picture":j.get("thumbnail",{}).get("source"),
            "iucn_status":status,
            "common_name":j.get("title") if j.get("title")!=name else ""}

def _groq(prompt, mx=60, T=0.7):
    if not GROQ_KEY: return ""
    body={"model":"llama3-70b-8192",
          "messages":[{"role":"user","content":prompt}],
          "max_tokens":mx,"temperature":T}
    try:
        r=requests.post(GROQ_URL,json=body,headers={"Authorization":f"Bearer {GROQ_KEY}"},timeout=20)
        if r.status_code==200:
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception: pass
    return ""

def _visual(name): return _groq(
    f"Give three very short bullet-point visual cues that help identify the fish species {name}.",60)

def _fun(name):    return _groq(
    f"Provide one fun trivia fact (max 25 words) about the fish species {name}.",50,0.8)

# ---------- species catalog (static JSON from Fishial docs) ----
def _catalog():
    with importlib.resources.open_text(__package__,"species_catalog.json") as f:
        return json.load(f)                  # [ "Caranx ignobilis", ... ]

# ---------- public ------------------------------------------------
def get(name: str):
    """
    name == '_list'  → list[dict]  (each dict has 'scientific_name' and 'common_name')
    otherwise        → dict       (meta bundle for that species)
    """
    if name == "_list":
        return _catalog()          # <- now returns list of dicts, not strings

    with shelve.open("fish_cache") as db:
        rec  = db.get(name, {})
        if time.time() - rec.get("_ts", 0) > CACHE_S:
            rec = {**_fishbase(name), **_wiki(name), "_ts": time.time()}

        if "visual_cues" not in rec:
            rec["visual_cues"] = _visual(name)
        if "fun_facts" not in rec:
            rec["fun_facts"] = _fun(name)

        db[name] = rec
        return rec


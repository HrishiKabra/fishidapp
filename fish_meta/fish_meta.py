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

def _visual(name): 
    prompt = f"""List exactly 3 visual identification cues for {name}. Use this EXACT format (no extra text, no numbering):

• **Feature name**: Brief description.
• **Feature name**: Brief description.  
• **Feature name**: Brief description.

Do not add any introductory text or explanations."""
    return _groq(prompt, 120)

def _fun(name):    return _groq(
    f"Provide one fun trivia fact (max 25 words) about the fish species {name}.",50,0.8)

def _simple_description(name):
    """Generate a simple, casual description of the fish"""
    prompt = f"""Write a simple, casual description of {name} in 2-3 sentences. 
    Focus on what makes this fish interesting to regular people, not scientists.
    Keep it friendly and easy to understand. Avoid scientific jargon."""
    return _groq(prompt, 100, 0.8)

def _clean_visual_cues(text: str) -> str:
    """Clean up malformed visual cues text"""
    if not text:
        return ""
    
    # Remove any introductory text
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if line.startswith('•') or line.startswith('-'):
            # Ensure proper formatting
            if '**' in line and ':' in line:
                cleaned_lines.append(line)
            else:
                # Try to fix malformed lines
                if '**' in line:
                    parts = line.split('**')
                    if len(parts) >= 3:
                        feature = parts[1].strip()
                        description = parts[2].replace(':', '').strip()
                        cleaned_lines.append(f"• **{feature}**: {description}")
    
    return '\n'.join(cleaned_lines) if cleaned_lines else text

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

    with shelve.open("fish_cache_final") as db:
        rec  = db.get(name, {})
        if time.time() - rec.get("_ts", 0) > CACHE_S:
            rec = {**_fishbase(name), **_wiki(name), "_ts": time.time()}

        if "visual_cues" not in rec:
            visual_cues = _visual(name)
            rec["visual_cues"] = _clean_visual_cues(visual_cues)
        if "fun_facts" not in rec:
            rec["fun_facts"] = _fun(name)
        if "description" not in rec:
            rec["description"] = _simple_description(name)

        db[name] = rec
        return rec


"""
fish_meta.py
------------
Pulls structured information for a fish species from:
  • FishBase open API
  • Wikipedia REST summary
  • Groq Cloud (Llama-3-70B) for visual cues + a fun fact
Everything is cached in a local shelve DB so each species hits
external APIs only once per day.
"""

from __future__ import annotations
import os, time, urllib.parse as up, shelve, requests

# ---------------- configuration ----------------
CACHE_SECONDS  = 24 * 3600                          # re-query once a day
FISHBASE_URL   = "https://fishbase.ropensci.org/species?Scientific_Name="
WIKI_URL       = "https://en.wikipedia.org/api/rest_v1/page/summary/"
GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY       = os.getenv("GROQ_API_KEY")           # put this in .env / Render
# ------------------------------------------------


def _fishbase(name: str) -> dict:
    """Return dict with keys common_name, habitat, distribution, max_length_cm, picture."""
    try:
        j = requests.get(FISHBASE_URL + up.quote(name), timeout=15).json()
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


def _wiki(name: str) -> dict:
    """Return dict with keys intro, picture, iucn_status, common_name (fallback)."""
    r = requests.get(WIKI_URL + up.quote(name.replace(" ", "_")), timeout=15)
    if r.status_code != 200:
        return {}

    j = r.json()
    status = ""
    if "description" in j and "IUCN" in j["description"]:
        # crude extract e.g. "LC", "EN"
        status = j["description"].split("(")[-1].strip(")")

    return {
        "intro":        j.get("extract"),
        "picture":      j.get("thumbnail", {}).get("source"),
        "iucn_status":  status,
        "common_name":  j.get("title") if j.get("title") != name else "",
    }


def _groq_prompt(prompt: str, max_tokens: int = 80, temperature: float = 0.7) -> str:
    """Return single string reply from Groq Llama-3 model, or empty string on failure."""
    if not GROQ_KEY:
        return ""
    body = {
        "model": "llama3-70b-8192",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    try:
        r = requests.post(GROQ_URL, json=body,
                          headers={"Authorization": f"Bearer {GROQ_KEY}"},
                          timeout=20)
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return ""


def _visual_cues(name: str) -> str:
    return _groq_prompt(
        f"Give three very short bullet-point visual cues (colour, pattern, shape) "
        f"that help identify the fish species {name}. Limit to 40 words total.",
        max_tokens=60
    )


def _fun_fact(name: str) -> str:
    return _groq_prompt(
        f"Provide one fun trivia fact (max 25 words) about the fish species {name}.",
        max_tokens=50, temperature=0.8
    )


# ---------------- public helper ----------------
def get(scientific_name: str) -> dict:
    """
    Return cached, merged dict for the given scientific name.
    Keys that may appear:
      common_name, intro, habitat, distribution, max_length_cm,
      picture, iucn_status, visual_cues, fun_facts
    """
    with shelve.open("fish_cache") as db:
        item = db.get(scientific_name, {})
        is_stale = not item or time.time() - item.get("_ts", 0) > CACHE_SECONDS

        if is_stale:
            item = {**_fishbase(scientific_name), **_wiki(scientific_name)}
            item["_ts"] = time.time()

        if "visual_cues" not in item:
            item["visual_cues"] = _visual_cues(scientific_name)
        if "fun_facts" not in item:
            item["fun_facts"] = _fun_fact(scientific_name)

        db[scientific_name] = item
        return item

import os, base64, requests, io
from pathlib import Path

# (Optional local model)
try:
    from fishid.infer import FishIdentifier
    _LOCAL = FishIdentifier(weights=Path("models/classifier.pt"), device="cpu")
except Exception:
    _LOCAL = None

_ID     = os.getenv("FISHIAL_CLIENT_ID")
_SECRET = os.getenv("FISHIAL_SECRET")
_URL    = "https://api.fishial.ai/v1/recognize"

def _cloud(img):
    r = requests.post(_URL, json={
        "api_key": _ID,
        "api_secret": _SECRET,
        "image": base64.b64encode(img).decode()
    }, timeout=30)
    r.raise_for_status()
    d = r.json()
    return {"species": d["species"], "prob": d["prob"]}

def predict(img):
    if _ID and _SECRET:
        return _cloud(img)
    if _LOCAL:
        s, p = _LOCAL.predict(io.BytesIO(img))
        return {"species": s, "prob": p}
    raise RuntimeError("No Fishial credentials and no local model found")

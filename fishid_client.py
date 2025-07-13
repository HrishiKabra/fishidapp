import os, base64, requests, io
from pathlib import Path
import io
from PIL import Image

MAX_DIM  = 1024     # px; drop to 720 if you still get 413
JPEG_Q   = 85       # %  (smaller file at ~75–80 if needed)

def _prep(img_bytes: bytes) -> bytes:
    """Resize & recompress so payload < 1 MB."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_DIM:
        scale = MAX_DIM / float(max(w, h))
        img = img.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q)
    return buf.getvalue()

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
    img_small = _prep(img)
    if _ID and _SECRET:
        return _cloud(img_small)
    if _LOCAL:
        s, p = _LOCAL.predict(io.BytesIO(img_small))
        return {"species": s, "prob": p}
    raise RuntimeError("No Fishial credentials and no local model found")

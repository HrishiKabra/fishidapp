"""
fishid_client.py – minimal Fishial-DEV wrapper
Only deps: requests, Pillow
"""

import os, io, base64, hashlib, json, mimetypes, time
from pathlib import Path
from typing import Tuple

import requests
from PIL import Image

# ----------------------------------------------------------------------
# 1 Secrets from .env  (already loaded in app.py via python-dotenv)
# ----------------------------------------------------------------------
_ID     = os.getenv("FISHIAL_CLIENT_ID")
_SECRET = os.getenv("FISHIAL_SECRET")
if not (_ID and _SECRET):
    raise RuntimeError("Fishial creds missing in environment")

# ----------------------------------------------------------------------
# 2 Helpers
# ----------------------------------------------------------------------
MAX_DIM = 1024            # px (keeps file < 1 MB after JPEG Q=85)
JPEG_Q  = 85
_TOKEN: Tuple[str, float] = ("", 0)    # (token, expires_epoch)

def _resize_jpeg(raw: bytes) -> bytes:
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_DIM:
        scale = MAX_DIM / float(max(w, h))
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q, optimize=True)
    return buf.getvalue()

def _md5_b64(b: bytes) -> str:
    return base64.b64encode(hashlib.md5(b).digest()).decode()

def _token() -> str:
    # refresh only if < 60 s left
    global _TOKEN
    if time.time() < _TOKEN[1] - 60:
        return _TOKEN[0]
    url  = "https://api-users.fishial.ai/v1/auth/token"
    resp = requests.post(url, json={"client_id": _ID, "client_secret": _SECRET}, timeout=15)
    resp.raise_for_status()
    tok  = resp.json()["access_token"]
    _TOKEN = (tok, time.time() + 9 * 60)     # 9-min validity (spec says 10)
    return tok

# ----------------------------------------------------------------------
# 3 Public function
# ----------------------------------------------------------------------
def predict(raw: bytes) -> dict:
    """
    Returns {'species': str, 'prob': float}

    Raises requests.HTTPError on network / API errors.
    """
    img   = _resize_jpeg(raw)
    name  = "upload.jpg"
    mime  = "image/jpeg"
    size  = len(img)
    chks  = _md5_b64(img)

    # ---- a) auth header ----
    hdr   = {"Authorization": f"Bearer {_token()}"}

    # ---- b) ask for signed upload slot ----
    up_url = "https://api.fishial.ai/v1/recognition/upload"
    payload = {
        "blob": {
            "filename": name,
            "content_type": mime,
            "byte_size": size,
            "checksum": chks,
        }
    }
    r = requests.post(up_url, json=payload, headers={**hdr, "Content-Type": "application/json"}, timeout=15)
    r.raise_for_status()
    data = r.json()
    signed_id        = data["signed-id"]
    s3_url           = data["direct-upload"]["url"]
    content_disp     = data["direct-upload"]["headers"]["Content-Disposition"]

    # ---- c) PUT the image to S3 ----
    s3_headers = {
        "Content-Disposition": content_disp,
        "Content-Md5": chks,
        "Content-Type": "",          # Fishial doc: must be empty
    }
    r = requests.put(s3_url, data=img, headers=s3_headers, timeout=30)
    r.raise_for_status()

    # ---- d) run recognition ----
    recog_url = f"https://api.fishial.ai/v1/recognition/image?q={signed_id}"
    r = requests.get(recog_url, headers=hdr, timeout=30)
    r.raise_for_status()
    res = r.json()["results"]

    # Take the top species of the first detected fish
    species_blk = res[0]["species"][0]
    return {
        "species":   species_blk["name"],
        "prob":      float(species_blk["accuracy"]),
    }

# app.py  – Fishial-powered version
import os
from io import BytesIO
from pathlib import Path
from flask import Flask, render_template, request, redirect
from PIL import Image
import json
from fish_meta import get as meta_for
from dotenv import load_dotenv

# --- load .env (contains FISHIAL_CLIENT_ID + FISHIAL_SECRET) ---
load_dotenv()

# --- local modules ---
from fishid_client import predict           # wrapper added earlier

# ----------------------------------------------------------------
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"

# ---------- helper data ----------
META = json.loads(Path("fishmeta.json").read_text())

def canonical(label: str) -> str:
    """Match 'Butterfly fish' → 'Butterflyfish' JSON key."""
    return label.replace(" ", "").title()

ALLOWED_EXTS = {"jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "heic"}
def allowed_file(fname: str) -> bool:
    return "." in fname and fname.rsplit(".", 1)[1].lower() in ALLOWED_EXTS
# ----------------------------------------------------------------


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":

        # ---------- 1  basic upload gates ----------
        if "image" not in request.files:
            return redirect(request.url)           # no file part

        file = request.files["image"]
        if file.filename == "":
            return redirect(request.url)           # empty filename

        if not allowed_file(file.filename):
            return "Unsupported file type", 400

        # ---------- 2  read & validate image ----------
        img_bytes = file.read()
        try:
            Image.open(BytesIO(img_bytes)).verify()    # quick sanity check
        except Exception:
            return "Could not read image", 400

        # ---------- 3  persist a JPEG copy (optional) ----------
        base = os.path.splitext(file.filename)[0]
        safe_name = f"{base}.jpg"
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_name)
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        # Convert to RGB & save – ensures consistent format downstream
        Image.open(BytesIO(img_bytes)).convert("RGB").save(save_path,
                                                          format="JPEG",
                                                          quality=90)

        # ---------- 4  Fishial prediction ----------
        try:
            out = predict(img_bytes)      # {'species': str, 'prob': float}
        except Exception as e:
            return f"Prediction error: {e}", 500

        label = out["species"]
        confidence = out["prob"]
        out  = predict(img_bytes)          # {'species': 'Caranx ignobilis', 'prob': 0.97}
        meta = meta_for(out["species"])    # pulls + caches FishBase / Wiki data

        # ---------- 5  render result ----------
        return render_template("index.html",
                       uploaded_image=safe_name,            # original (saved) image
                       label=out["species"],
                       confidence=int(out["prob"]*100),
                       meta=meta)

    # GET
    return render_template("index.html")


if __name__ == "__main__":
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    app.run(debug=True)

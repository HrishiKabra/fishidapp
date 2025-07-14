# app.py  – Fishial-powered + Log + Map placeholder
import os
from io import BytesIO
from pathlib import Path
from flask import Flask, render_template, request, redirect, url_for, session
from PIL import Image
from dotenv import load_dotenv

from fishid_client import predict          # wrapper you already have
from fish_meta.fish_meta      import get as meta_for  # enriched facts

# ---------------------------------------------------------------
load_dotenv()                               # loads Fishial + Groq keys
app = Flask(__name__)
app.secret_key          = os.getenv("SECRET_KEY", "fishid-dev")
app.config["UPLOAD_FOLDER"] = "static/uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

ALLOWED_EXT = {"jpg","jpeg","png","gif","bmp","webp","tiff","heic"}
def _ext_ok(name): return "." in name and name.rsplit(".",1)[1].lower() in ALLOWED_EXT
def _seen(): return session.setdefault("seen", set())
# ---------------------------------------------------------------


@app.route("/", methods=["GET","POST"])
def index():
    if request.method == "POST":
        if "image" not in request.files or request.files["image"].filename == "":
            return redirect(request.url)

        file = request.files["image"]
        if not _ext_ok(file.filename):
            return "Unsupported file type", 400

        # ---------- read + sanity-check ----------
        raw = file.read()
        try:  Image.open(BytesIO(raw)).verify()
        except Exception: return "Could not read image", 400

        # ---------- save jpg copy ----------
        fname = f"{Path(file.filename).stem}.jpg"
        path  = Path(app.config["UPLOAD_FOLDER"]) / fname
        Image.open(BytesIO(raw)).convert("RGB").save(path, format="JPEG", quality=90)

        # ---------- predict ----------
        try:
            out = predict(raw)               # {'species': str, 'prob': float}
        except Exception as e:
            return f"Prediction error: {e}", 500

        scientific  = out["species"]
        confidence  = int(out["prob"]*100)
        meta        = meta_for(scientific)

        return render_template("index.html",
                               scientific=scientific,
                               confidence=confidence,
                               meta=meta,
                               uploaded_image=fname)

    # GET
    return render_template("index.html")


# ---------------- Fish Log -------------------------------------
@app.route("/log")
def log_page():
    # ——— 1. add species via  ?add=<scientific> ———
    add = request.args.get("add")
    if add:
        _seen().add(add)          # seen() is your session-set helper
        session.modified = True
        return redirect(url_for("log_page"))

    # ——— 2. figure out filter state ———
    filt  = request.args.get("f", "all")      # all | seen | unseen
    seen  = _seen()                           # set[str]

    # ——— 3. full catalog (list[dict]) ———
    total = meta_for("_list") or []           # each item: {"scientific_name": …, "common_name": …}

    # fallback if catalog missing
    if not total:
        total = [{"scientific_name": s, "common_name": ""} for s in sorted(seen)]

    # ——— 4. build the view list according to filter ———
    if filt == "seen":
        view = [e for e in total if e["scientific_name"] in seen]
    elif filt == "unseen":
        view = [e for e in total if e["scientific_name"] not in seen]
    else:                                      # "all"
        view = total

    # ——— 5. render ———
    return render_template(
        "log.html",
        list=view,          # list of entry dicts to show
        seen=seen,          # the set -> used for the check-mark
        total=total,        # whole catalog
        filt=filt
    )

# ---------------- Map placeholder ------------------------------
@app.route("/map")
def map_page(): return render_template("map.html")


if __name__ == "__main__":
    app.run(debug=True)

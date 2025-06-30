# app.py
from flask import Flask, render_template, request, redirect, url_for
import os
from fishid_logic import crop_fish, classify_fish
from io import BytesIO
from PIL import Image
import json
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

META = json.loads(Path("fishmeta.json").read_text())

def canonical(label: str) -> str:
    """Match 'Butterfly fish' → 'Butterflyfish' JSON key."""
    return label.replace(" ", "").title()


ALLOWED_EXTS = {"jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "heic"}
def allowed_file(filename: str) -> bool:
    """Fast extension gate (keeps instant 400 for .exe, .txt, etc.)."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS

# Replace with your actual keys
DETECTION_API_KEY = os.getenv('LANDINGAI_DETECTION_API_KEY')
DETECTION_ENDPOINT_ID = os.getenv('LANDINGAI_DETECTION_ENDPOINT_ID')
CLASSIFICATION_API_KEY = os.getenv('LANDINGAI_CLASSIFICATION_API_KEY')
CLASSIFICATION_ENDPOINT_ID = os.getenv('LANDINGAI_CLASSIFICATION_ENDPOINT_ID')

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'image' not in request.files:
            return redirect(request.url)

        file = request.files['image']
        if file.filename == '':
            return redirect(request.url)
        
        # Gatekeep by extension first (quick 400 for .exe etc.)
        if not allowed_file(file.filename):
            return "Unsupported file type", 400

        try:
            # Pillow opens virtually every raster format, even if the
            # filename extension is wrong.
            img = Image.open(file.stream).convert("RGB")
        except Exception:
            return "Could not read image", 400

        # Always store as .jpg so downstream functions never worry
        base = os.path.splitext(file.filename)[0]     # strip original extension
        safe_name = f"{base}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)

        # Save a JPEG copy – keeps your crop_fish / classify_fish unchanged
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        img.save(filepath, format="JPEG", quality=90)

        # Step 1: Crop fish
        cropped_path = crop_fish(filepath, DETECTION_API_KEY, DETECTION_ENDPOINT_ID)

        # Step 2: Classify fish
        label, confidence = classify_fish(cropped_path, CLASSIFICATION_API_KEY, CLASSIFICATION_ENDPOINT_ID)
        
        meta = META.get(canonical(label))

        return render_template('index.html', uploaded_image=safe_name, cropped_image=os.path.basename(cropped_path), label=label, meta=meta, confidence=round(confidence * 100, 2))

    return render_template('index.html')

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)

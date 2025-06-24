# app.py
from flask import Flask, render_template, request, redirect, url_for
import os
from fishid_logic import crop_fish, classify_fish
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

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

        if file:
            filename = file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Step 1: Crop fish
            cropped_path = crop_fish(filepath, DETECTION_API_KEY, DETECTION_ENDPOINT_ID)

            # Step 2: Classify fish
            label = classify_fish(cropped_path, CLASSIFICATION_API_KEY, CLASSIFICATION_ENDPOINT_ID)

            return render_template('index.html', uploaded_image=filename, cropped_image=os.path.basename(cropped_path), label=label)

    return render_template('index.html')

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)

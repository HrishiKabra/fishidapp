# fishid_logic.py
from landingai.predict import Predictor
from PIL import Image
import uuid
import os

def crop_fish(image_path, api_key, endpoint_id, output_dir="static/uploads"):
    from PIL import Image
    import uuid, os
    from landingai.predict import Predictor

    predictor = Predictor(endpoint_id=endpoint_id, api_key=api_key)
    img = Image.open(image_path)
    predictions = predictor.predict(img)

    if not predictions:
        raise Exception("No fish detected in the image.")

    # Get bounding box tuple directly
    left, top, right, bottom = predictions[0].bboxes

    cropped_img = img.crop((left, top, right, bottom))

    cropped_filename = f"cropped_{uuid.uuid4().hex}.png"
    cropped_path = os.path.join(output_dir, cropped_filename)
    cropped_img.save(cropped_path)

    return cropped_path


def classify_fish(image_path, api_key, endpoint_id):
    from landingai.predict import Predictor
    from PIL import Image

    predictor = Predictor(endpoint_id=endpoint_id, api_key=api_key)
    img = Image.open(image_path)
    predictions = predictor.predict(img)

    if not predictions:
        return "Unknown" + " " + "0.0"

    return predictions[0].label_name + " " + predictions[0].score


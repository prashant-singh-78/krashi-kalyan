import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import shutil

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
IMG_SIZE = 128
MODEL_PATH = r"c:\Users\prash\OneDrive\Desktop\image.ml\cat_model.keras"

# Load Model once at startup
if not os.path.exists(MODEL_PATH):
    # Fallback to .h5 if .keras is missing
    MODEL_PATH = r"c:\Users\prash\OneDrive\Desktop\image.ml\cat_detector_v1.h5"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model file not found at {MODEL_PATH}")

print(f"Loading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Save temp file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load and Preprocess Image
        img = cv2.imread(temp_path)
        if img is None:
            return {"error": "Could not read image"}
            
        img_resized = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
        img_rescaled = img_resized / 255.0
        img_input = np.expand_dims(img_rescaled, axis=0)

        # Predict
        prediction = model.predict(img_input, verbose=0)[0][0]
        
        # Mapping: >= 0.5 is CAT, < 0.5 is NOT A CAT (Swapped based on user feedback)
        is_cat = prediction >= 0.5
        confidence = prediction * 100 if is_cat else (1 - prediction) * 100
        result = "CAT" if is_cat else "NOT A CAT"

        return {
            "result": result,
            "confidence": round(float(confidence), 2),
            "is_cat": bool(is_cat)
        }
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/")
async def root():
    return FileResponse("index.html")

# Mount other static files (css, js) if needed, 
# although index.html will look for them in the same directory.
# For simplicity, we can just serve the whole directory or use FileResponse for specific ones.
app.mount("/static", StaticFiles(directory="."), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

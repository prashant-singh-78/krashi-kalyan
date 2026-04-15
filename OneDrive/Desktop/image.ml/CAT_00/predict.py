import cv2
import numpy as np
import tensorflow as tf
import sys
import os

# Configuration
IMG_SIZE = 128
MODEL_PATH = r"c:\Users\prash\OneDrive\Desktop\image.ml\cat_detector_v1.h5"

def predict_cat(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        return

    # Load Model
    if not os.path.exists(MODEL_PATH):
        print("Error: Model file not found. Please train the model first.")
        return
    
    model = tf.keras.models.load_model(MODEL_PATH)

    # Load and Preprocess Image
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Could not read image.")
        return
        
    img_resized = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img_rescaled = img_resized / 255.0
    img_input = np.expand_dims(img_rescaled, axis=0)

    # Predict
    prediction = model.predict(img_input, verbose=0)[0][0]
    
    # Mapping: >= 0.5 is CAT, < 0.5 is NOT A CAT
    if prediction >= 0.5:
        print(f"\nResult: CAT (Confidence: {prediction*100:.2f}%)")
    else:
        print(f"\nResult: NOT A CAT (Confidence: {(1-prediction)*100:.2f}%)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_image>")
        # Default test if no argument
        test_img = r"c:\Users\prash\OneDrive\Desktop\image.ml\CAT_00\00000001_000.jpg"
        print(f"Running default test on: {test_img}")
        predict_cat(test_img)
    else:
        predict_cat(sys.argv[1])

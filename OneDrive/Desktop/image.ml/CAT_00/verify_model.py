import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns

# Configuration
IMG_SIZE = 128
BATCH_SIZE = 32
BASE_DIR = r"c:\Users\prash\OneDrive\Desktop\image.ml\training_data"
MODEL_PATH = r"c:\Users\prash\OneDrive\Desktop\image.ml\cat_detector_v1.h5"

def verify():
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        return

    print("Loading model and data for evaluation...")
    model = tf.keras.models.load_model(MODEL_PATH)
    
    # Data Generator for Validation
    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    
    val_gen = datagen.flow_from_directory(
        BASE_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        shuffle=False
    )

    # 1. Evaluate
    loss, acc = model.evaluate(val_gen)
    print(f"\nFinal Accuracy: {acc*100:.2f}%")

    # 2. Confusion Matrix
    print("\nGenerating Confusion Matrix...")
    y_pred = (model.predict(val_gen) > 0.5).astype("int32")
    y_true = val_gen.classes
    
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Cat', 'Not Cat'], 
                yticklabels=['Cat', 'Not Cat'])
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Cat Detection Confusion Matrix')
    
    # Save the matrix image
    save_path = r"c:\Users\prash\OneDrive\Desktop\image.ml\confusion_matrix.png"
    plt.savefig(save_path)
    print(f"Confusion Matrix saved to {save_path}")
    
    # Print Classification Report
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=['Cat', 'Not Cat']))

if __name__ == "__main__":
    verify()

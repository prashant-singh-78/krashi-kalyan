import os
import numpy as np
import cv2
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt

# Configuration
IMG_SIZE = 128
BATCH_SIZE = 32
CAT_DIR = r"c:\Users\prash\OneDrive\Desktop\image.ml\CAT_00"
SYNTH_DIR = r"c:\Users\prash\OneDrive\Desktop\image.ml\NOT_CAT"

# 1. Generate Synthetic "Not Cat" Data
def generate_synthetic_data(directory, count=500):
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    print(f"Generating {count} synthetic negative samples...")
    for i in range(count):
        # Create random noise, gradients, or geometric shapes
        img_type = np.random.randint(0, 3)
        img = np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
        
        if img_type == 0: # Random Noise
            img = np.random.randint(0, 256, (IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
        elif img_type == 1: # Gradient
            c1 = np.random.randint(0, 256, 3)
            c2 = np.random.randint(0, 256, 3)
            for y in range(IMG_SIZE):
                mix = y / IMG_SIZE
                img[y, :] = (1 - mix) * c1 + mix * c2
        else: # Random Shapes
            img.fill(np.random.randint(0, 256))
            for _ in range(5):
                cv2.circle(img, 
                           (np.random.randint(0, IMG_SIZE), np.random.randint(0, IMG_SIZE)),
                           np.random.randint(10, 50),
                           tuple(map(int, np.random.randint(0, 256, 3))),
                           -1)
        
        cv2.imwrite(os.path.join(directory, f"synth_{i}.jpg"), img)

# 2. Main Training Block
if __name__ == "__main__":
    # Ensure dataset is ready
    # We need a temporary structure for flow_from_directory:
    # training/
    #   cat/
    #   not_cat/
    
    BASE_DIR = r"c:\Users\prash\OneDrive\Desktop\image.ml\training_data"
    os.makedirs(os.path.join(BASE_DIR, "cat"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "not_cat"), exist_ok=True)
    
    # Generate negatives
    generate_synthetic_data(os.path.join(BASE_DIR, "not_cat"), count=len([f for f in os.listdir(CAT_DIR) if f.endswith('.jpg')]))
    
    # Symlink or Copy cats (using copy for Windows compatibility if symlink fails)
    import shutil
    print("Preparing cat images...")
    for f in os.listdir(CAT_DIR):
        if f.endswith('.jpg'):
            src = os.path.join(CAT_DIR, f)
            dst = os.path.join(BASE_DIR, "cat", f)
            if not os.path.exists(dst):
                shutil.copy(src, dst)

    # 3. Data Generators
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )

    train_gen = datagen.flow_from_directory(
        BASE_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='training'
    )

    val_gen = datagen.flow_from_directory(
        BASE_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation'
    )

    # 4. CNN Model (3 layers as requested)
    model = models.Sequential([
        # Layer 1
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(IMG_SIZE, IMG_SIZE, 3)),
        layers.MaxPooling2D((2, 2)),
        
        # Layer 2
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        # Layer 3
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5), # Regularization
        layers.Dense(1, activation='sigmoid')
    ])

    model.compile(optimizer='adam',
                  loss='binary_crossentropy',
                  metrics=['accuracy'])

    print("Starting training...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=15
    )

    # 5. Save Model
    model.save(r"c:\Users\prash\OneDrive\Desktop\image.ml\cat_detector_v1.h5")
    print("Model saved as cat_detector_v1.h5")

import face_recognition
import numpy as np

# Create a small blank image to test face detection/encoding
img = np.zeros((100, 100, 3), dtype=np.uint8)
try:
    # This will trigger model loading
    face_locations = face_recognition.face_locations(img)
    print("SUCCESS: face_recognition models loaded!")
except Exception as e:
    print(f"FAILED: models not loaded: {e}")

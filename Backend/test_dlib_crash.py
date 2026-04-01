import face_recognition
import numpy as np
import sys

print(f"Python version: {sys.version}")
print(f"Numpy version: {np.__version__}")

# create a fake 100x100x3 uint8 image
img = np.zeros((100, 100, 3), dtype=np.uint8)
try:
    print("Testing face_encodings on fake image...")
    # This might return empty but shouldn't throw "Unsupported image type"
    encs = face_recognition.face_encodings(img)
    print(f"Success! Found {len(encs)} faces.")
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")

import face_recognition
import os

img_path = "face_images/EMP-001.jpg"
if not os.path.exists(img_path):
    print(f"File not found: {img_path}")
    sys.exit(1)

try:
    print(f"Testing face_encodings on EXISTING image: {img_path}")
    image = face_recognition.load_image_file(img_path)
    print(f"Shape: {image.shape}, Dtype: {image.dtype}")
    encs = face_recognition.face_encodings(image)
    print(f"Success! Found {len(encs)} face(s).")
except Exception as e:
    print(f"FAILED: {e}")

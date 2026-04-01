import sys
try:
    import face_recognition
    print("face_recognition: OK")
except Exception as e:
    print(f"face_recognition ERROR: {e}")

try:
    import cv2
    print(f"opencv: OK (v{cv2.__version__})")
except Exception as e:
    print(f"opencv ERROR: {e}")

try:
    import numpy as np
    print(f"numpy: OK (v{np.__version__})")
except Exception as e:
    print(f"numpy ERROR: {e}")

try:
    import dlib
    print(f"dlib: OK (v{dlib.__version__})")
except Exception as e:
    print(f"dlib ERROR: {e}")

try:
    import pickle
    print("pickle: OK")
except Exception as e:
    print(f"pickle ERROR: {e}")

print("All FRS imports test complete.")

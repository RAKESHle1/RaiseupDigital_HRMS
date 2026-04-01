import sys
import os

with open("frs_import_results.txt", "w") as f:
    try:
        import face_recognition
        f.write("face_recognition: OK\n")
    except Exception as e:
        f.write(f"face_recognition ERROR: {e}\n")

    try:
        import cv2
        f.write(f"opencv: OK (v{cv2.__version__})\n")
    except Exception as e:
        f.write(f"opencv ERROR: {e}\n")

    try:
        import numpy as np
        f.write(f"numpy: OK (v{np.__version__})\n")
    except Exception as e:
        f.write(f"numpy ERROR: {e}\n")

    try:
        import dlib
        f.write(f"dlib: OK (v{dlib.__version__})\n")
    except Exception as e:
        f.write(f"dlib ERROR: {e}\n")

    try:
        import pickle
        f.write("pickle: OK\n")
    except Exception as e:
        f.write(f"pickle ERROR: {e}\n")

    f.write("All tests finished.\n")
print("Results written to frs_import_results.txt")

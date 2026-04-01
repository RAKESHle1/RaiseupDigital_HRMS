import pkg_resources
import os

try:
    models_path = pkg_resources.resource_filename('face_recognition_models', 'models')
    print(f"Models path found: {models_path}")
    if os.path.exists(models_path):
        print(f"Directory exists: {models_path}")
        print(f"Files: {os.listdir(models_path)}")
    else:
        print(f"Directory does NOT exist: {models_path}")
except Exception as e:
    print(f"pkg_resources failed: {e}")

try:
    import face_recognition_models
    print(f"Import successful: {face_recognition_models.__file__}")
except Exception as e:
    print(f"Import failed: {e}")

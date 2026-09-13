import os
import io
import glob
import numpy as np
from PIL import Image

# Global cache for ONNX sessions and label maps
ONNX_SESSIONS = []
ONNX_LABELS = {}

def init_onnx_models():
    """Initializes local ONNX inference sessions if onnxruntime is installed and models exist."""
    global ONNX_SESSIONS, ONNX_LABELS
    ONNX_SESSIONS = []
    ONNX_LABELS = {}

    try:
        import onnxruntime as ort
    except ImportError:
        return False

    model_paths = glob.glob("*.onnx") + glob.glob("models/*.onnx")
    if not model_paths:
        return False

    # Load valid pokemon names
    valid_pokemon = []
    if os.path.exists("pokemon.txt"):
        with open("pokemon.txt", "r", encoding="utf-8") as f:
            valid_pokemon = [p.strip().lower() for p in f.read().splitlines() if p.strip()]

    for path in model_paths:
        try:
            session = ort.InferenceSession(path, providers=['CPUExecutionProvider'])
            ONNX_SESSIONS.append((path, session))
            print(f"[PROJECT DARK] [ONNX] Loaded local ONNX model: {path}")
        except Exception as e:
            print(f"[PROJECT DARK] [ONNX] Failed to load {path}: {e}")

    return len(ONNX_SESSIONS) > 0

def preprocess_image(image_bytes, target_size=(224, 224)):
    """Preprocesses raw image bytes into normalized (1, 3, H, W) float32 numpy array."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize(target_size, Image.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        # Normalize (ImageNet mean & std)
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        # HWC -> CHW -> NCHW
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, axis=0)
        return arr
    except Exception as e:
        print(f"[ONNX] Preprocessing error: {e}")
        return None

def classify_image(image_bytes):
    """
    Attempts local ONNX classification on image bytes.
    Returns: predicted pokemon_name (str) or None.
    """
    if not ONNX_SESSIONS:
        if not init_onnx_models():
            return None

    tensor = preprocess_image(image_bytes)
    if tensor is None:
        return None

    with open("pokemon.txt", "r", encoding="utf-8") as f:
        valid_pokemon = [p.strip().lower() for p in f.read().splitlines() if p.strip()]

    for model_path, session in ONNX_SESSIONS:
        try:
            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: tensor})
            logits = outputs[0][0]
            top_idx = int(np.argmax(logits))
            
            # Map index to pokemon if index in range of pokemon.txt
            if top_idx < len(valid_pokemon):
                predicted = valid_pokemon[top_idx]
                print(f"\033[92m[PROJECT DARK] [ONNX LOCAL] Model {os.path.basename(model_path)} predicted: {predicted}\033[0m")
                return predicted
        except Exception as e:
            print(f"[ONNX] Inference exception on {model_path}: {e}")

    return None

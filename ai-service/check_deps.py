import sys
import importlib
import os

REQUIRED_PYTHON = (3, 9)
REQUIRED_PACKAGES = {
    "torch":             "torch",
    "transformers":      "transformers",
    "diffusers":         "diffusers",
    "fastapi":           "fastapi",
    "uvicorn":           "uvicorn",
    "PIL":               "pillow",
    "pydantic":          "pydantic",
    "safetensors":       "safetensors",
    "huggingface_hub":   "huggingface-hub",
}

def check():
    ok = True
    print("=" * 50)
    print("  ПРОВЕРКА PYTHON ЗАВИСИМОСТЕЙ")
    print("=" * 50)

    ver = sys.version_info[:2]
    needed = f"{REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}"
    current = f"{ver[0]}.{ver[1]}"
    if ver >= REQUIRED_PYTHON:
        print(f"  Python {current} ............. OK")
    else:
        print(f"  Python {current} ............. ОШИБКА (нужен >={needed})")
        ok = False

    for module, pip_name in REQUIRED_PACKAGES.items():
        try:
            mod = importlib.import_module(module)
            v = getattr(mod, "__version__", "?")
            print(f"  {pip_name:<25} {v} OK")
        except ImportError:
            print(f"  {pip_name:<25} НЕ НАЙДЕН  -->  pip install {pip_name}")
            ok = False

    print("=" * 50)
    if ok:
        print("  Все Python зависимости установлены!")
    else:
        print("  Установите недостающие пакеты:")
        print("  pip install torch transformers diffusers fastapi uvicorn pillow pydantic safetensors huggingface-hub")
    print("=" * 50)
    return ok

if __name__ == "__main__":
    sys.exit(0 if check() else 1)

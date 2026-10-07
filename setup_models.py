"""Скачивает нейромодели в models/ (около 6 ГБ)."""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODELS = {
    "small-sd": ("segmind/small-sd", "model_index.json"),
    "qwen3-1.7b": ("Qwen/Qwen3-1.7B", "config.json"),
}


def download(name, repo_id, marker):
    dest = os.path.join(MODELS_DIR, name)
    if os.path.exists(os.path.join(dest, marker)):
        print(f"  {name:<14} уже есть — пропуск")
        return True

    print(f"  {name:<14} скачиваю {repo_id} ...")
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id=repo_id, local_dir=dest, max_workers=8)
    except Exception as e:
        print(f"  {name:<14} ОШИБКА: {e}")
        return False

    if not os.path.exists(os.path.join(dest, marker)):
        print(f"  {name:<14} ОШИБКА: файл {marker} не появился")
        return False
    print(f"  {name:<14} готово")
    return True


def main():
    print("=" * 50)
    print("  ЗАГРУЗКА МОДЕЛЕЙ")
    print("=" * 50)
    os.makedirs(MODELS_DIR, exist_ok=True)
    ok = True
    for name, (repo_id, marker) in MODELS.items():
        ok = download(name, repo_id, marker) and ok
    print("=" * 50)
    if ok:
        print("  Все модели на месте")
    else:
        print("  Часть моделей не скачалась — проверьте интернет")
    print("=" * 50)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

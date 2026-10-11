"""Скачивает нейромодели в models/ (около 6 ГБ)."""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODELS = {
    "small-sd": ("segmind/small-sd", "model_index.json"),
}

GGUF_MODEL = {
    "dir": "qwen2.5-1.5b-instruct",
    "repo_id": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    "filename": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
}


def download(name, repo_id, marker):
    dest = os.path.join(MODELS_DIR, name)
    if os.path.exists(os.path.join(dest, marker)):
        print(f"  {name:<20} уже есть — пропуск")
        return True

    print(f"  {name:<20} скачиваю {repo_id} ...")
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id=repo_id, local_dir=dest, max_workers=8)
    except Exception as e:
        print(f"  {name:<20} ОШИБКА: {e}")
        return False

    if not os.path.exists(os.path.join(dest, marker)):
        print(f"  {name:<20} ОШИБКА: файл {marker} не появился")
        return False
    print(f"  {name:<20} готово")
    return True


def download_gguf(cfg):
    dest = os.path.join(MODELS_DIR, cfg["dir"])
    marker = os.path.join(dest, cfg["filename"])
    if os.path.exists(marker):
        print(f"  {cfg['dir']:<20} уже есть — пропуск")
        return True

    print(f"  {cfg['dir']:<20} скачиваю {cfg['repo_id']}/{cfg['filename']} ...")
    try:
        from huggingface_hub import hf_hub_download
        os.makedirs(dest, exist_ok=True)
        hf_hub_download(repo_id=cfg["repo_id"], filename=cfg["filename"], local_dir=dest)
    except Exception as e:
        print(f"  {cfg['dir']:<20} ОШИБКА: {e}")
        return False

    if not os.path.exists(marker):
        print(f"  {cfg['dir']:<20} ОШИБКА: файл {cfg['filename']} не появился")
        return False
    print(f"  {cfg['dir']:<20} готово")
    return True


def main():
    print("=" * 50)
    print("  ЗАГРУЗКА МОДЕЛЕЙ")
    print("=" * 50)
    os.makedirs(MODELS_DIR, exist_ok=True)
    ok = True
    for name, (repo_id, marker) in MODELS.items():
        ok = download(name, repo_id, marker) and ok
    ok = download_gguf(GGUF_MODEL) and ok
    print("=" * 50)
    if ok:
        print("  Все модели на месте")
    else:
        print("  Часть моделей не скачалась — проверьте интернет")
    print("=" * 50)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

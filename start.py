import subprocess
import sys
import os
import time
import signal
import shutil
import traceback
import urllib.request
import urllib.error

LOG_FILE = None

def safe_print(text):
    try:
        print(text, end="")
    except UnicodeEncodeError:
        try:
            sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
        except Exception:
            pass
    if LOG_FILE:
        try:
            LOG_FILE.write(text)
            LOG_FILE.flush()
        except Exception:
            pass

def log_error(text):
    safe_print(f"  [ERROR] {text}\n")
    if LOG_FILE:
        try:
            LOG_FILE.write(f"[ERROR] {text}\n")
            LOG_FILE.flush()
        except Exception:
            pass

def log_ok(text):
    safe_print(f"  [OK]    {text}\n")

def log_info(text):
    safe_print(f"  [INFO]  {text}\n")

def log_warn(text):
    safe_print(f"  [WARN]  {text}\n")

def log_debug(text):
    safe_print(f"  [DEBUG] {text}\n")

def log_step(step, text):
    safe_print(f"\n{'='*60}\n  [{step}] {text}\n{'='*60}\n")

def log_subprocess_output(prefix, out, err, returncode):
    if out.strip():
        for line in out.strip().splitlines():
            safe_print(f"    {prefix} | {line}\n")
    if err.strip():
        for line in err.strip().splitlines():
            safe_print(f"    {prefix} ERR | {line}\n")
    safe_print(f"    {prefix} exit code: {returncode}\n")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
AI_SVC_DIR = os.path.join(BASE_DIR, "ai-service")
MODELS_DIR = os.path.join(BASE_DIR, "models")

processes = []
log_lines = []

def cleanup(sig=None, frame=None):
    safe_print("\n\n[CLEANUP] Остановка серверов...\n")
    for i, p in enumerate(processes):
        try:
            safe_print(f"  [CLEANUP] Terminating process {i} (PID={p.pid})...\n")
            p.terminate()
            p.wait(timeout=5)
            safe_print(f"  [CLEANUP] Process {i} terminated.\n")
        except Exception as e:
            safe_print(f"  [CLEANUP] Process {i} terminate failed: {e}\n")
            try:
                p.kill()
                safe_print(f"  [CLEANUP] Process {i} killed.\n")
            except Exception as e2:
                safe_print(f"  [CLEANUP] Process {i} kill also failed: {e2}\n")
    safe_print("[CLEANUP] Готово!\n")
    if LOG_FILE:
        try:
            LOG_FILE.close()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
try:
    signal.signal(signal.SIGTERM, cleanup)
except (OSError, AttributeError):
    pass

def find_node():
    for p in [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
    ]:
        if os.path.exists(p):
            log_info(f"Node.js found at: {p}")
            return p
    log_warn("Node.js not found in standard paths, trying 'node' from PATH")
    return "node"

def find_npm():
    for p in [
        r"C:\Program Files\nodejs\npm.cmd",
        r"C:\Program Files (x86)\nodejs\npm.cmd",
    ]:
        if os.path.exists(p):
            log_info(f"npm found at: {p}")
            return p
    log_warn("npm not found in standard paths, trying 'npm' from PATH")
    return "npm"

def kill_port(port):
    log_info(f"Killing processes on port {port}...")
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        log_debug(f"netstat exit code: {result.returncode}")
        found = 0
        for line in result.stdout.splitlines():
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                pid = parts[-1]
                log_info(f"  Found PID {pid} on port {port}")
                subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
                found += 1
                time.sleep(2)
        if found == 0:
            log_info(f"  No processes found on port {port}")
        else:
            log_info(f"  Killed {found} process(es) on port {port}")
            time.sleep(2)
    except Exception as e:
        log_error(f"kill_port({port}) failed: {e}")

def wait_for_health(url, timeout=120, interval=3, label="service"):
    log_info(f"Waiting for {label} at {url} (timeout={timeout}s)...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = resp.read().decode("utf-8", errors="replace")
                log_ok(f"{label} is ready! ({time.time()-start:.1f}s) — {data.strip()}")
                return True
        except (urllib.error.URLError, ConnectionRefusedError, OSError, TimeoutError):
            elapsed = int(time.time() - start)
            if elapsed % 15 == 0 and elapsed > 0:
                log_info(f"  Still waiting for {label}... ({elapsed}s / {timeout}s)")
            time.sleep(interval)
        except Exception as e:
            log_warn(f"  health check error: {e}")
            time.sleep(interval)
    log_error(f"{label} did NOT become ready within {timeout}s")
    return False

def ask_yes(question):
    try:
        answer = input(f"  {question} [Y/n]: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print("")
        return False
    return answer not in ("n", "no", "нет", "0")

def run_cmd(args, cwd=None, timeout=3600, name="cmd"):
    log_info(f"Запуск: {' '.join(str(a) for a in args)}")
    if cwd:
        log_info(f"  cwd: {cwd}")
    try:
        r = subprocess.run(
            args, cwd=cwd, shell=True, capture_output=True,
            encoding="utf-8", errors="replace", timeout=timeout,
        )
        log_subprocess_output(name, r.stdout, r.stderr, r.returncode)
        return r.returncode == 0
    except subprocess.TimeoutExpired:
        log_error(f"{name}: превышено время ожидания ({timeout}s)")
        return False
    except Exception as e:
        log_error(f"{name}: {e}")
        log_debug(traceback.format_exc())
        return False

def refresh_path():
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')"],
            capture_output=True, encoding="utf-8", errors="replace", timeout=30,
        )
        new_path = (r.stdout or "").strip()
        if new_path:
            os.environ["PATH"] = new_path
            log_info("PATH обновлён из реестра")
    except Exception as e:
        log_warn(f"Не удалось обновить PATH: {e}")

def node_ok():
    return bool(shutil.which("node")) and bool(shutil.which("npm"))

def check_python_deps():


    log_step("CHECK 1/3", "Python зависимости...")
    check_script = os.path.join(AI_SVC_DIR, "check_deps.py")
    log_info(f"Script: {check_script}")
    log_info(f"Exists: {os.path.exists(check_script)}")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        r = subprocess.run([sys.executable, "-X", "utf8", check_script], capture_output=True, env=env, timeout=180)
        out = r.stdout.decode("utf-8", errors="replace")
        err = r.stderr.decode("utf-8", errors="replace")
        log_subprocess_output("python-check", out, err, r.returncode)
        return r.returncode == 0
    except FileNotFoundError as e:
        log_error(f"Python not found: {e}")
        return False
    except subprocess.TimeoutExpired:
        log_error("check_deps.py timed out after 60s")
        return False
    except Exception as e:
        log_error(f"check_python_deps exception: {e}")
        log_debug(traceback.format_exc())
        return False

def check_node_deps():
    log_step("CHECK 2/3", "Node.js зависимости...")
    check_script = os.path.join(BACKEND_DIR, "check_deps.js")
    node = find_node()
    log_info(f"Script: {check_script}")
    log_info(f"Exists: {os.path.exists(check_script)}")
    log_info(f"Node binary: {node}")
    try:
        r = subprocess.run([node, check_script], capture_output=True, timeout=60)
        out = r.stdout.decode("utf-8", errors="replace")
        err = r.stderr.decode("utf-8", errors="replace")
        log_subprocess_output("node-check", out, err, r.returncode)
        return r.returncode == 0
    except FileNotFoundError as e:
        log_error(f"Node.js not found: {e}")
        return False
    except subprocess.TimeoutExpired:
        log_error("check_deps.js timed out after 60s")
        return False
    except Exception as e:
        log_error(f"check_node_deps exception: {e}")
        log_debug(traceback.format_exc())
        return False

def check_models():
    log_step("CHECK 3/3", "Модели...")
    ok = True
    image_model = os.path.join(MODELS_DIR, "small-sd", "model_index.json")
    text_model = os.path.join(MODELS_DIR, "qwen3-1.7b", "config.json")
    log_info(f"MODELS_DIR: {MODELS_DIR}")
    log_info(f"MODELS_DIR exists: {os.path.exists(MODELS_DIR)}")
    log_info(f"Image model path: {image_model}")
    log_info(f"Text model path: {text_model}")

    if os.path.exists(image_model):
        log_ok("small-sd ................. OK")
    else:
        log_error(f"small-sd ................. НЕ НАЙДЕН  -->  models/small-sd/")
        log_debug(f"  Checking dir contents of {os.path.join(MODELS_DIR, 'small-sd')}:")
        sd_dir = os.path.join(MODELS_DIR, "small-sd")
        if os.path.exists(sd_dir):
            for f in os.listdir(sd_dir):
                log_debug(f"    {f}")
        else:
            log_debug(f"    Directory does not exist: {sd_dir}")
        ok = False

    if os.path.exists(text_model):
        log_ok("qwen3-1.7b .............. OK")
    else:
        log_error(f"qwen3-1.7b .............. НЕ НАЙДЕН  -->  models/qwen3-1.7b/")
        log_debug(f"  Checking dir contents of {os.path.join(MODELS_DIR, 'qwen3-1.7b')}:")
        qw_dir = os.path.join(MODELS_DIR, "qwen3-1.7b")
        if os.path.exists(qw_dir):
            for f in os.listdir(qw_dir):
                log_debug(f"    {f}")
        else:
            log_debug(f"    Directory does not exist: {qw_dir}")
        ok = False

    return ok

def check_env():
    log_step("ENV", "Окружение...")
    log_info(f"Python: {sys.executable}")
    log_info(f"Python version: {sys.version}")
    log_info(f"Platform: {sys.platform}")
    log_info(f"BASE_DIR: {BASE_DIR}")
    log_info(f"BACKEND_DIR: {BACKEND_DIR}")
    log_info(f"FRONTEND_DIR: {FRONTEND_DIR}")
    log_info(f"AI_SVC_DIR: {AI_SVC_DIR}")
    log_info(f"MODELS_DIR: {MODELS_DIR}")

    log_info("Checking directories exist...")
    for name, d in [("BACKEND_DIR", BACKEND_DIR), ("FRONTEND_DIR", FRONTEND_DIR), ("AI_SVC_DIR", AI_SVC_DIR), ("MODELS_DIR", MODELS_DIR)]:
        exists = os.path.exists(d)
        if exists:
            log_ok(f"{name} exists")
        else:
            log_error(f"{name} does NOT exist: {d}")

    log_info("Checking key files...")
    for name, f in [
        ("server.js", os.path.join(BACKEND_DIR, "server.js")),
        ("database.js", os.path.join(BACKEND_DIR, "database.js")),
        ("generate.js", os.path.join(BACKEND_DIR, "routes", "generate.js")),
        ("ai-chats.js", os.path.join(BACKEND_DIR, "routes", "ai-chats.js")),
        ("main.py", os.path.join(AI_SVC_DIR, "main.py")),
    ]:
        exists = os.path.exists(f)
        if exists:
            log_ok(f"{name} exists ({os.path.getsize(f)} bytes)")
        else:
            log_error(f"{name} does NOT exist: {f}")

    log_info("Checking installed Python packages...")
    try:
        r = subprocess.run([sys.executable, "-c", "import diffusers; print('diffusers', diffusers.__version__)"], capture_output=True, text=True, timeout=30)
        if r.returncode == 0:
            log_ok(f"  {r.stdout.strip()}")
        else:
            log_warn(f"  diffusers: {r.stderr.strip()}")
    except Exception as e:
        log_warn(f"  diffusers check failed: {e}")

    try:
        r = subprocess.run([sys.executable, "-c", "import transformers; print('transformers', transformers.__version__)"], capture_output=True, text=True, timeout=30)
        if r.returncode == 0:
            log_ok(f"  {r.stdout.strip()}")
        else:
            log_warn(f"  transformers: {r.stderr.strip()}")
    except Exception as e:
        log_warn(f"  transformers check failed: {e}")

    try:
        r = subprocess.run([sys.executable, "-c", "import torch; print('torch', torch.__version__, 'cuda:', torch.cuda.is_available())"], capture_output=True, text=True, timeout=30)
        if r.returncode == 0:
            log_ok(f"  {r.stdout.strip()}")
        else:
            log_warn(f"  torch: {r.stderr.strip()}")
    except Exception as e:
        log_warn(f"  torch check failed: {e}")

    try:
        r = subprocess.run([sys.executable, "-c", "import fastapi; print('fastapi', fastapi.__version__)"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            log_ok(f"  {r.stdout.strip()}")
        else:
            log_warn(f"  fastapi: {r.stderr.strip()}")
    except Exception as e:
        log_warn(f"  fastapi check failed: {e}")

    try:
        r = subprocess.run([sys.executable, "-c", "import uvicorn; print('uvicorn', uvicorn.__version__)"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            log_ok(f"  {r.stdout.strip()}")
        else:
            log_warn(f"  uvicorn: {r.stderr.strip()}")
    except Exception as e:
        log_warn(f"  uvicorn check failed: {e}")

    log_info("Checking installed Node.js packages...")
    backend_modules = os.path.join(BACKEND_DIR, "node_modules")
    frontend_modules = os.path.join(FRONTEND_DIR, "node_modules")
    log_info(f"  backend/node_modules: {os.path.exists(backend_modules)}")
    log_info(f"  frontend/node_modules: {os.path.exists(frontend_modules)}")

def ensure_python_deps():
    if check_python_deps():
        return True
    log_step("STEP 1/8", "Python зависимости не установлены")
    req = os.path.join(BASE_DIR, "requirements.txt")
    if not os.path.exists(req):
        log_error(f"Нет {req}")
        return False
    if not ask_yes("Доустановить Python зависимости (pip install -r requirements.txt)?"):
        log_warn("Пропущено — AI-сервис может не запуститься")
        return False
    if not run_cmd([sys.executable, "-m", "pip", "install", "-r", req], timeout=3600, name="pip"):
        log_error("pip install завершился с ошибкой")
        return False
    return check_python_deps()

def ensure_node():
    if node_ok():
        log_step("STEP 2/8", "Node.js и npm — OK")
        return True
    refresh_path()
    if node_ok():
        log_step("STEP 2/8", "Node.js и npm — OK (после обновления PATH)")
        return True

    log_step("STEP 2/8", "Node.js / npm не найдены")
    log_error("Node.js нужен для бэкенда (3001) и фронтенда (5173)")
    if os.name != "nt":
        log_error("Установите Node.js 18+ с https://nodejs.org и перезапустите скрипт")
        return False
    if not ask_yes("Установить Node.js через winget?"):
        log_error("Установите Node.js 18+ с https://nodejs.org и перезапустите скрипт")
        return False
    run_cmd(
        ["winget", "install", "--id", "OpenJS.NodeJS.LTS", "-e", "--source", "winget",
         "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity"],
        timeout=1800, name="winget",
    )
    refresh_path()
    if not node_ok():
        log_error("Node.js не подхватился — закройте и откройте консоль заново")
        return False
    log_ok("Node.js установлен")
    return True

def ensure_npm_deps(step, name, directory):
    if os.path.exists(os.path.join(directory, "node_modules")):
        log_step(f"STEP {step}/8", f"Зависимости {name} — OK")
        return True
    log_step(f"STEP {step}/8", f"Установка зависимостей {name}")
    if not ask_yes(f"Каталог {name}/node_modules отсутствует. Выполнить npm install?"):
        log_warn(f"Пропущено — {name} не запустится")
        return False
    npm = find_npm()
    return run_cmd([npm, "install"], cwd=directory, timeout=1800, name=f"npm-{name}")

def ensure_models():
    if check_models():
        log_step("STEP 5/8", "Модели — OK")
        return True
    log_step("STEP 5/8", "Модели не найдены (~6 ГБ)")
    if not ask_yes("Скачать модели сейчас (small-sd + Qwen3-1.7B, ~6 ГБ)?"):
        log_warn("Пропущено — генерация изображений и AI-чаты не будут работать")
        return False
    script = os.path.join(BASE_DIR, "setup_models.py")
    if not os.path.exists(script):
        log_error(f"Нет {script}")
        return False
    if not run_cmd([sys.executable, script], cwd=BASE_DIR, timeout=14400, name="models"):
        log_error("Не удалось скачать модели")
        return False
    return check_models()

def start_backend():


    node = find_node()
    log_step("STEP 6/8", "Запуск бэкенда (порт 3001)...")
    kill_port(3001)
    server_js = os.path.join(BACKEND_DIR, "server.js")
    log_info(f"server.js: {server_js}")
    log_info(f"server.js exists: {os.path.exists(server_js)}")
    log_info(f"Working dir: {BACKEND_DIR}")
    log_info(f"Working dir exists: {os.path.exists(BACKEND_DIR)}")
    try:
        backend = subprocess.Popen(
            [node, "server.js"],
            cwd=BACKEND_DIR,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        processes.append(backend)
        log_info(f"Backend PID: {backend.pid}")
        time.sleep(3)
        exit_code = backend.poll()
        if exit_code is not None:
            log_error(f"Бэкенд остановился с кодом {exit_code}!")
            try:
                out = backend.stdout.read().decode("utf-8", errors="replace")
                err = backend.stderr.read().decode("utf-8", errors="replace")
                log_subprocess_output("backend", out, err, exit_code)
            except Exception as e:
                log_error(f"Could not read backend output: {e}")
            return None
        if wait_for_health("http://127.0.0.1:3001/health", timeout=15, interval=1, label="Backend"):
            log_ok("Бэкенд полностью готов — OK")
            return backend
        else:
            log_ok("Бэкенд запущен (health check не критичен) — OK")
            return backend
    except Exception as e:
        log_error(f"Failed to start backend: {e}")
        log_debug(traceback.format_exc())
        return None

def start_ai_service():
    log_step("STEP 7/8", "Запуск AI Service (порт 8000)...")
    kill_port(8000)
    ai_main = os.path.join(AI_SVC_DIR, "main.py")
    log_info(f"main.py: {ai_main}")
    log_info(f"main.py exists: {os.path.exists(ai_main)}")
    log_info(f"Working dir: {AI_SVC_DIR}")
    log_info(f"Python: {sys.executable}")
    ai_env = os.environ.copy()
    ai_env["PYTHONIOENCODING"] = "utf-8"
    try:
        img_svc = subprocess.Popen(
            [sys.executable, ai_main],
            cwd=AI_SVC_DIR,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=ai_env
        )
        processes.append(img_svc)
        log_info(f"AI Service PID: {img_svc.pid}")
        time.sleep(5)
        exit_code = img_svc.poll()
        if exit_code is not None:
            log_warn(f"AI Service остановился с кодом {exit_code}")
            try:
                out = img_svc.stdout.read().decode("utf-8", errors="replace")
                err = img_svc.stderr.read().decode("utf-8", errors="replace")
                log_subprocess_output("ai-svc", out, err, exit_code)
            except Exception as e:
                log_error(f"Could not read AI service output: {e}")
            return None
        if wait_for_health("http://127.0.0.1:8000/health", timeout=180, interval=5, label="AI Service"):
            log_ok("AI Service полностью готов — OK")
            return img_svc
        else:
            log_error("AI Service не ответил на health check за 180 секунд")
            return None
    except Exception as e:
        log_error(f"Failed to start AI service: {e}")
        log_debug(traceback.format_exc())
        return None

def start_frontend():
    npm = find_npm()
    log_step("STEP 8/8", "Запуск фронтенда (порт 5173)...")
    log_info(f"npm: {npm}")
    log_info(f"Working dir: {FRONTEND_DIR}")
    log_info(f"package.json exists: {os.path.exists(os.path.join(FRONTEND_DIR, 'package.json'))}")
    try:
        frontend = subprocess.Popen(
            [npm, "run", "dev"],
            cwd=FRONTEND_DIR,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        processes.append(frontend)
        log_info(f"Frontend PID: {frontend.pid}")
        time.sleep(5)
        exit_code = frontend.poll()
        if exit_code is not None:
            log_warn(f"Фронтенд остановился с кодом {exit_code}")
            try:
                out = frontend.stdout.read().decode("utf-8", errors="replace")
                err = frontend.stderr.read().decode("utf-8", errors="replace")
                log_subprocess_output("frontend", out, err, exit_code)
            except Exception as e:
                log_error(f"Could not read frontend output: {e}")
            return None
        log_ok("Фронтенд запущен — OK")
        return frontend
    except Exception as e:
        log_error(f"Failed to start frontend: {e}")
        log_debug(traceback.format_exc())
        return None

def install_deps_step(step_num, name, directory, cmd):
    log_step(f"STEP {step_num}/5", f"Установка зависимостей {name}...")
    log_info(f"Directory: {directory}")
    log_info(f"Command: {cmd}")
    log_info(f"Directory exists: {os.path.exists(directory)}")
    try:
        r = subprocess.run(cmd, cwd=directory, shell=True, capture_output=True, encoding="utf-8", errors="replace", timeout=300)
        log_subprocess_output(name, r.stdout, r.stderr, r.returncode)
        if r.returncode != 0:
            log_error(f"npm install failed for {name}")
            return False
        log_ok(f"Dependencies for {name} installed")
        return True
    except subprocess.TimeoutExpired:
        log_error(f"npm install timed out for {name}")
        return False
    except Exception as e:
        log_error(f"npm install failed for {name}: {e}")
        log_debug(traceback.format_exc())
        return False

def main():
    global LOG_FILE

    log_path = os.path.join(BASE_DIR, "start_log.txt")
    try:
        LOG_FILE = open(log_path, "w", encoding="utf-8")
    except Exception:
        pass

    safe_print("=" * 60 + "\n")
    safe_print("  DISCORD CLONE — ЗАПУСК ПРОГРАММЫ С ПОДРОБНЫМИ ЛОГАМИ\n")
    safe_print(f"  Log file: {log_path}\n")
    safe_print("=" * 60 + "\n")

    node = find_node()
    npm = find_npm()
    python_bin = sys.executable

    log_info(f"Node: {node}")
    log_info(f"npm: {npm}")
    log_info(f"Python: {python_bin}")
    log_info(f"Python version: {sys.version}")

    try:
        check_env()
    except Exception as e:
        log_error(f"Environment check crashed: {e}")
        log_debug(traceback.format_exc())

    safe_print("\n")
    log_step("SETUP", "Проверка и доустановка недостающего")

    try:
        ensure_python_deps()
    except Exception as e:
        log_error(f"Python deps install CRASHED: {e}")
        log_debug(traceback.format_exc())

    try:
        if not ensure_node():
            log_error("Без Node.js запустить невозможно (бэкенд и фронтенд).")
            log_error("Установите Node.js 18+ с https://nodejs.org и перезапустите.")
            input("\n  Нажмите Enter для выхода...")
            sys.exit(1)
    except Exception as e:
        log_error(f"Node.js check CRASHED: {e}")
        log_debug(traceback.format_exc())
        input("\n  Нажмите Enter для выхода...")
        sys.exit(1)

    try:
        ensure_npm_deps(3, "backend", BACKEND_DIR)
        ensure_npm_deps(4, "frontend", FRONTEND_DIR)
    except Exception as e:
        log_error(f"npm install CRASHED: {e}")
        log_debug(traceback.format_exc())

    try:
        ensure_models()
    except Exception as e:
        log_error(f"Models install CRASHED: {e}")
        log_debug(traceback.format_exc())

    safe_print("\n")
    log_ok("Проверки и установка завершены")
    safe_print("\n")

    backend = start_backend()
    if backend is None:
        log_error("Бэкенд не запустился! Завершение.")
        input("\n  Нажмите Enter для выхода...")
        sys.exit(1)

    img_svc = start_ai_service()
    if img_svc is None:
        log_warn("AI Service не запустился (не критично, продолжаем...)")

    frontend = start_frontend()

    safe_print("\n")
    safe_print("=" * 60 + "\n")
    safe_print("  Discord Clone готов к работе!\n")
    safe_print("\n")
    safe_print("  Frontend:    http://localhost:5173\n")
    safe_print("  Backend:     http://localhost:3001\n")
    safe_print("  AI Service:  http://localhost:8000\n")
    safe_print("\n")
    safe_print("  Нажмите Ctrl+C для остановки\n")
    safe_print("=" * 60 + "\n")
    safe_print("\n")

    try:
        while True:
            time.sleep(5)

            if backend is not None and backend.poll() is not None:
                exit_code = backend.poll()
                log_warn(f"\n[!] Бэкенд остановился (код={exit_code}). Перезапуск...")
                try:
                    out = backend.stdout.read().decode("utf-8", errors="replace")
                    err = backend.stderr.read().decode("utf-8", errors="replace")
                    log_subprocess_output("backend-crash", out, err, exit_code)
                except Exception:
                    pass
                kill_port(3001)
                node = find_node()
                try:
                    backend = subprocess.Popen([node, "server.js"], cwd=BACKEND_DIR, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    processes[0] = backend
                    log_info(f"Backend restarted, PID: {backend.pid}")
                    time.sleep(3)
                    if backend.poll() is not None:
                        log_error(f"Backend crashed immediately after restart (code={backend.poll()})")
                        backend = None
                except Exception as e:
                    log_error(f"Backend restart failed: {e}")
                    backend = None

            if img_svc is not None and img_svc.poll() is not None:
                exit_code = img_svc.poll()
                log_warn(f"\n[!] AI Service остановился (код={exit_code}). Перезапуск...")
                try:
                    out = img_svc.stdout.read().decode("utf-8", errors="replace")
                    err = img_svc.stderr.read().decode("utf-8", errors="replace")
                    log_subprocess_output("ai-svc-crash", out, err, exit_code)
                except Exception:
                    pass
                kill_port(8000)
                ai_main = os.path.join(AI_SVC_DIR, "main.py")
                ai_env = os.environ.copy()
                ai_env["PYTHONIOENCODING"] = "utf-8"
                try:
                    img_svc = subprocess.Popen([sys.executable, ai_main], cwd=AI_SVC_DIR, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ai_env)
                    processes[1] = img_svc
                    log_info(f"AI Service restarted, PID: {img_svc.pid} (модели загружаются ~40-60с)")
                except Exception as e:
                    log_error(f"AI Service restart failed: {e}")
                    img_svc = None

            if frontend is not None and frontend.poll() is not None:
                exit_code = frontend.poll()
                log_warn(f"\n[!] Фронтенд остановился (код={exit_code}). Перезапуск...")
                try:
                    out = frontend.stdout.read().decode("utf-8", errors="replace")
                    err = frontend.stderr.read().decode("utf-8", errors="replace")
                    log_subprocess_output("frontend-crash", out, err, exit_code)
                except Exception:
                    pass
                npm = find_npm()
                try:
                    frontend = subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND_DIR, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    processes[2] = frontend
                    log_info(f"Frontend restarted, PID: {frontend.pid}")
                    time.sleep(3)
                except Exception as e:
                    log_error(f"Frontend restart failed: {e}")
                    frontend = None

    except KeyboardInterrupt:
        cleanup()
    except Exception as e:
        log_error(f"Main loop crashed: {e}")
        log_debug(traceback.format_exc())
        cleanup()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        safe_print(f"\n[FATAL] {e}\n")
        safe_print(traceback.format_exc())
        input("\nPress Enter to exit...")
        sys.exit(1)

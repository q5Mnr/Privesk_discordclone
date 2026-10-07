import os
import sys
import time
import uuid
import base64
import io
import threading
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import torch

MODEL_PATH = r"C:\Users\Администратор\Desktop\Важное\Лагерь\Новая папка\discord-clone\models\DreamShaper8_LCM.safetensors"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)

pipe = None
device = "cpu"
model_loaded = False
model_error = None

def get_device():
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

def load_model_background():
    global pipe, device, model_loaded, model_error

    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        model_error = f"Model not found at {MODEL_PATH}"
        print(f"[ImageService] ERROR: {model_error}")
        return

    device = get_device()
    dtype = torch.bfloat16 if device != "cpu" else torch.float32

    print(f"[ImageService] Loading DreamShaper8_LCM on {device}... (this may take a while)")

    from diffusers import StableDiffusionPipeline, LCMScheduler

    try:
        pipe = StableDiffusionPipeline.from_single_file(
            str(model_path),
            torch_dtype=dtype,
            safety_checker=None,
            requires_safety_checker=False,
            local_files_only=True,
        )

        pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
        pipe.to(device)

        if device != "cpu":
            pipe.enable_attention_slicing()

        model_loaded = True
        print("[ImageService] Model loaded successfully")
    except Exception as e:
        model_error = str(e)
        print(f"[ImageService] ERROR loading model: {e}", flush=True)
        import traceback
        traceback.print_exc()

@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=load_model_background, daemon=True)
    thread.start()
    yield

app = FastAPI(title="Image Generation Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    negative_prompt: str = Field(default="", max_length=1000)
    width: int = Field(default=512, ge=256, le=1024)
    height: int = Field(default=512, ge=256, le=1024)
    steps: int = Field(default=4, ge=1, le=50)
    guidance_scale: float = Field(default=2.0, ge=0.0, le=20.0)
    seed: int = Field(default=-1)

class GenerateResponse(BaseModel):
    image: str
    filename: str
    seed: int
    inference_time: float

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if pipe is None:
        if model_error:
            raise HTTPException(503, f"Model failed to load: {model_error}")
        raise HTTPException(503, "Model is still loading, please wait...")

    generator = None
    seed = req.seed
    if seed == -1:
        seed = int(time.time() * 1000) % (2**32)
    generator = torch.Generator(device=device if device != "cpu" else "cpu").manual_seed(seed)

    start = time.time()
    try:
        result = pipe(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt if req.negative_prompt else None,
            width=req.width,
            height=req.height,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            generator=generator,
            num_images_per_prompt=1,
        )
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")

    inference_time = round(time.time() - start, 2)
    image: Image.Image = result.images[0]

    filename = f"gen_{uuid.uuid4().hex[:12]}.png"
    save_path = OUTPUT_DIR / filename
    image.save(save_path, "PNG")

    buf = io.BytesIO()
    image.save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return GenerateResponse(image=b64, filename=filename, seed=seed, inference_time=inference_time)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model_loaded,
        "model_error": model_error,
        "device": str(device),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

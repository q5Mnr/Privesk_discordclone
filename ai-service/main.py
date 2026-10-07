import os
import time
import uuid
import base64
import io
import json
import re
import gc
import threading
import unicodedata
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from PIL import Image
import torch

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)

IMAGE_MODEL_DIR = MODELS_DIR / "small-sd"
TEXT_MODEL_DIR = MODELS_DIR / "qwen3-1.7b"

pipe = None
text_model = None
text_tokenizer = None
device = "cpu"
image_model_loaded = False
text_model_loaded = False
image_model_error = None
text_model_error = None

def get_device():
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

def load_image_model():
    global pipe, device, image_model_loaded, image_model_error
    if not (IMAGE_MODEL_DIR / "model_index.json").exists():
        image_model_error = f"Model not found at {IMAGE_MODEL_DIR}"
        print(f"[Image] ERROR: {image_model_error}")
        return
    device = get_device()
    dtype = torch.bfloat16 if device != "cpu" else torch.float32
    print(f"[Image] Loading small-sd on {device}...")
    from diffusers import StableDiffusionPipeline
    try:
        pipe = StableDiffusionPipeline.from_pretrained(
            str(IMAGE_MODEL_DIR), torch_dtype=dtype, safety_checker=None,
            requires_safety_checker=False, local_files_only=True,
        )
        pipe.to(device)
        try:
            pipe.enable_attention_slicing()
            pipe.enable_vae_slicing()
        except Exception:
            pass
        image_model_loaded = True
        print("[Image] small-sd loaded OK")
    except Exception as e:
        image_model_error = str(e)
        print(f"[Image] ERROR: {e}")

def load_text_model():
    global text_model, text_tokenizer, text_model_loaded, text_model_error
    if not (TEXT_MODEL_DIR / "config.json").exists():
        text_model_error = f"Model not found at {TEXT_MODEL_DIR}"
        print(f"[Text] ERROR: {text_model_error}")
        return
    print("[Text] Loading Qwen3-1.7B...")
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        text_tokenizer = AutoTokenizer.from_pretrained(str(TEXT_MODEL_DIR), local_files_only=True)
        text_model = AutoModelForCausalLM.from_pretrained(
            str(TEXT_MODEL_DIR), local_files_only=True, low_cpu_mem_usage=True,
        )
        text_model.eval()
        text_model_loaded = True
        print(f"[Text] Qwen3-1.7B loaded OK (dtype={text_model.dtype})")
    except Exception as e:
        text_model_error = str(e)
        print(f"[Text] ERROR: {e}")
        import traceback
        traceback.print_exc()

def load_models_sequentially():
    print("[Startup] Loading image model first...")
    load_image_model()
    print("[Startup] Loading text model...")
    load_text_model()
    print("[Startup] All models loaded")

@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=load_models_sequentially, daemon=True).start()
    yield

app = FastAPI(title="AI Service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {
        "image_model": image_model_loaded,
        "text_model": text_model_loaded,
        "image_error": image_model_error,
        "text_error": text_model_error,
    }

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

def _strip_think(raw):
    m = re.search(r'<think>(.*?)</think>', raw, re.DOTALL)
    if m:
        return m.group(1).strip(), raw[m.end():].strip()
    return "", raw.strip()

def safe_print(*args, **kwargs):
    text = " ".join(str(a) for a in args)
    try:
        print(text.encode("ascii", errors="replace").decode("ascii"), **kwargs)
    except Exception:
        print("[unprintable]", **kwargs)

def _has_cyrillic(text):
    for ch in text:
        if 'CYRILLIC' in unicodedata.name(ch, ''):
            return True
    return False

def _translate_to_english(text):
    if not text_model or not text_tokenizer:
        return text
    if not _has_cyrillic(text):
        return text
    try:
        messages = [{"role": "user", "content": f"Translate the following text to English for use as an image generation prompt. Output ONLY the translation, nothing else:\n\n{text}"}]
        input_text = text_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        inputs = text_tokenizer(input_text, return_tensors="pt")
        with torch.no_grad():
            outputs = text_model.generate(**inputs, max_new_tokens=200, temperature=0.3, do_sample=False)
        result = text_tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
        print(f"[Translate] '{text}' -> '{result}'")
        return result if result else text
    except Exception as e:
        print(f"[Translate] Error: {e}")
        return text

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if pipe is None:
        if image_model_error:
            raise HTTPException(503, f"Image model failed: {image_model_error}")
        raise HTTPException(503, "Image model still loading...")
    prompt_en = _translate_to_english(req.prompt)
    neg_en = _translate_to_english(req.negative_prompt) if req.negative_prompt else ""
    seed = req.seed if req.seed != -1 else int(time.time() * 1000) % (2**32)
    generator = torch.Generator(device=device).manual_seed(seed)
    start = time.time()
    try:
        result = pipe(
            prompt=prompt_en, negative_prompt=neg_en or None,
            width=req.width, height=req.height, num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale, generator=generator, num_images_per_prompt=1,
        )
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")
    t = round(time.time() - start, 2)
    image = result.images[0]
    fn = f"gen_{uuid.uuid4().hex[:12]}.png"
    image.save(OUTPUT_DIR / fn, "PNG")
    buf = io.BytesIO()
    image.save(buf, "PNG")
    return GenerateResponse(image=base64.b64encode(buf.getvalue()).decode(), filename=fn, seed=seed, inference_time=t)

class TextGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    thinking: bool = Field(default=False)
    max_tokens: int = Field(default=256, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)

class TextGenerateResponse(BaseModel):
    text: str
    thinking_text: str = ""
    tokens_per_sec: float
    inference_time: float

@app.post("/generate-text", response_model=TextGenerateResponse)
async def generate_text(req: TextGenerateRequest):
    if text_model is None or text_tokenizer is None:
        if text_model_error:
            raise HTTPException(503, f"Text model failed: {text_model_error}")
        raise HTTPException(503, "Text model still loading...")
    start = time.time()
    try:
        messages = [{"role": "user", "content": req.prompt}]
        input_text = text_tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True,
            enable_thinking=req.thinking,
        )
        inputs = text_tokenizer(input_text, return_tensors="pt")
        input_len = inputs["input_ids"].shape[1]
        with torch.no_grad():
            outputs = text_model.generate(
                **inputs, max_new_tokens=req.max_tokens,
                temperature=req.temperature, top_p=req.top_p,
                do_sample=req.temperature > 0,
            )
        new_tokens = outputs[0][input_len:]
        raw_text = text_tokenizer.decode(new_tokens, skip_special_tokens=True)
        safe_print(f"[Text] tokens={len(new_tokens)} thinking={req.thinking}")
    except Exception as e:
        raise HTTPException(500, f"Text generation failed: {str(e)}")
    t = round(time.time() - start, 2)
    tps = round(len(new_tokens) / t, 2) if t > 0 else 0
    thinking_text, answer_text = _strip_think(raw_text)
    if not req.thinking:
        thinking_text = ""
    return TextGenerateResponse(text=answer_text, thinking_text=thinking_text, tokens_per_sec=tps, inference_time=t)

@app.post("/generate-text-stream")
async def generate_text_stream(req: TextGenerateRequest):
    if text_model is None or text_tokenizer is None:
        if text_model_error:
            raise HTTPException(503, f"Text model failed: {text_model_error}")
        raise HTTPException(503, "Text model still loading...")

    def event_stream():
        start = time.time()
        try:
            messages = [{"role": "user", "content": req.prompt}]
            input_text = text_tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True,
                enable_thinking=req.thinking,
            )
            inputs = text_tokenizer(input_text, return_tensors="pt")

            from transformers import TextIteratorStreamer
            streamer = TextIteratorStreamer(text_tokenizer, skip_special_tokens=False, skip_prompt=True)

            gen_kwargs = dict(
                **inputs, max_new_tokens=req.max_tokens,
                temperature=req.temperature, top_p=req.top_p,
                do_sample=req.temperature > 0,
                streamer=streamer,
            )
            thread = threading.Thread(target=text_model.generate, kwargs=gen_kwargs)
            thread.start()

            buf = ""
            in_thinking = False

            for text_chunk in streamer:
                buf += text_chunk
                while buf:
                    if not in_thinking:
                        open_idx = buf.find("<think>")
                        if open_idx >= 0:
                            before = buf[:open_idx]
                            if before:
                                yield f"data: {json.dumps({'type': 'text', 'text': before})}\n\n"
                            buf = buf[open_idx + 7:]
                            in_thinking = True
                            continue
                        close_idx = buf.find("</think>")
                        if close_idx >= 0:
                            buf = buf[close_idx + 8:]
                            continue
                        break
                    else:
                        close_idx = buf.find("</think>")
                        if close_idx >= 0:
                            before = buf[:close_idx]
                            if before:
                                yield f"data: {json.dumps({'type': 'thinking', 'text': before})}\n\n"
                            buf = buf[close_idx + 8:]
                            in_thinking = False
                            yield f"data: {json.dumps({'type': 'thinking_done'})}\n\n"
                            continue
                        break

            if buf:
                tag = "thinking" if in_thinking else "text"
                yield f"data: {json.dumps({'type': tag, 'text': buf})}\n\n"
                if in_thinking:
                    yield f"data: {json.dumps({'type': 'thinking_done'})}\n\n"

            thread.join()
            t = round(time.time() - start, 2)
            yield f"data: {json.dumps({'type': 'done', 'time': t})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"
            gc.collect()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

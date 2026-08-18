import os
import re

import httpx
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Allows your frontend (running on a different port) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten this to your LAN IP range later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen3.5:0.8b"


@app.get("/ping")
def ping():
    return {"status": "ok"}


@app.get("/model")
def get_model():
    return {"model": MODEL_NAME}


def strip_markdown(text: str) -> str:
    """Convert common Markdown syntax to plain text."""
    text = re.sub(r"```[\s\S]*?```", "", text)          # fenced code blocks
    text = re.sub(r"`([^`]*)`", r"\1", text)            # inline code
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)  # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)   # links
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)  # headings
    text = re.sub(r"^\s*([-*+]|\d+\.)\s+", "", text, flags=re.M)  # list markers
    text = re.sub(r">\s?", "", text, flags=re.M)        # blockquotes
    text = re.sub(r"[*_]{1,3}([^*_]*)[*_]{1,3}", r"\1", text)  # bold/italic
    text = re.sub(r"^[=-]{3,}\s*$", "", text, flags=re.M)  # hr / underlines
    return text.strip()


@app.post("/chat")
async def chat(prompt: str = Body(..., embed=True)):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": MODEL_NAME,
                    "prompt": (
                        "Answer in plain text only. Do NOT use Markdown, "
                        "headings, bullet points, bold, code blocks, or links.\n\n"
                        f"Question: {prompt}"
                    ),
                    "stream": False,
                    "think": False,  # skip qwen3.5's long "thinking" chain; it can take minutes on CPU
                },
            )
        response.raise_for_status()
        data = response.json()
        return {"reply": strip_markdown(data.get("response", ""))}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot reach Ollama. Is it running on localhost:11434?",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned an error: {exc.response.status_code}",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")


# Serve the frontend from the same server (single origin, no CORS needed).
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")


@app.get("/login.html", include_in_schema=False)
async def login_alias():
    return RedirectResponse("/")


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

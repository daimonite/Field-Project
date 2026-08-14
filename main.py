from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allows your frontend (running on a different port) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten this to your LAN IP range later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"status": "ok"}

import httpx
from fastapi import Body

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen3:1.7b"

@app.post("/chat")
async def chat(prompt: str = Body(..., embed=True)):
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False
        })
    data = response.json()
    return {"reply": data.get("response", "")}
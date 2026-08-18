from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, HTTPException, Header
import httpx
from fastapi import Body
from backend.models import SessionLocal, User
from backend.auth import hash_password, verify_password, create_token, decode_token

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/auth/register")
def register(name: str = Body(...), username: str = Body(...),
             dept: str = Body(...), password: str = Body(...),
             db=Depends(get_db)):
    if db.query(User).filter_by(username=username).first():
        raise HTTPException(400, "Username already taken")
    user = User(name=name, username=username, dept=dept,
                password_hash=hash_password(password),
                role="staff", status="pending")
    db.add(user)
    db.commit()
    return {"ok": True}

@app.post("/auth/login")
def login(username: str = Body(...), password: str = Body(...), db=Depends(get_db)):
    user = db.query(User).filter_by(username=username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    if user.status == "pending":
        raise HTTPException(403, "Account is still pending admin approval")
    if user.status == "removed":
        raise HTTPException(403, "Account has been deactivated")
    token = create_token(user.id, user.role)
    return {"ok": True, "token": token, "role": user.role, "name": user.name}

def get_current_user(authorization: str = Header(None), db=Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not logged in")
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    user = db.query(User).filter_by(id=payload["user_id"]).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user

@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "role": user.role}
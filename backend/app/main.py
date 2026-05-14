from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import preview, export

app = FastAPI(title="Tkinter Designer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preview.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}

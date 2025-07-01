from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
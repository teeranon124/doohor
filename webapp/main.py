from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from webapp.config import settings
from webapp.routers import auth, dorms, rooms, room_types, bills, repairs, orders, webhook

app = FastAPI(
    title=settings.APP_TITLE,
    debug=settings.DEBUG,
    version="1.0.0"
)

# Set up CORS middleware to allow Next.js local developer connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev simplicity; customize in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    print(f"[API Log] {request.method} {request.url.path} -> {response.status_code} ({duration:.2f}ms)")
    return response

# Mount API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dorms.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1")
app.include_router(room_types.router, prefix="/api/v1")
app.include_router(bills.router, prefix="/api/v1")
app.include_router(repairs.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(webhook.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_TITLE}

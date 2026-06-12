from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from webapp.config import settings
from webapp.routers import auth, dorms, rooms, room_types, bills, repairs

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

# Mount API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dorms.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1")
app.include_router(room_types.router, prefix="/api/v1")
app.include_router(bills.router, prefix="/api/v1")
app.include_router(repairs.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_TITLE}

from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/frequency/")

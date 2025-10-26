from fastapi import FastAPI
import os,requests
import googlemaps
from dotenv import load_dotenv
import polyline

load_dotenv()

app = FastAPI()
 
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/routes")
async def get_routes(origin, destination, mode):
    valid_modes = {"driving", "walking", "bicycling", "transit", "two_wheeler"}
    if mode not in valid_modes:
        mode = "driving"
    directions = gmaps.directions(origin, destination, mode=mode,alternatives=True)
    routes = []
    num = 1
    for route in directions:
        encoded_polyline = route['overview_polyline']['points']
        coords = polyline.decode(encoded_polyline)
        routes.append({"Route: "+str(num):num,"coordinates":coords})
        num+=1
    return routes


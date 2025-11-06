from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os,requests
import googlemaps
from dotenv import load_dotenv
import polyline
import json
from genson import SchemaBuilder
import redis.asyncio as redis
import math
import httpx


load_dotenv()
app = FastAPI()
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))
redis_client = redis.from_url("redis://localhost:6379",decode_resposes=True)

meteo_url = "https://api.open-meteo.com/v1/forecast"


origins=["http://localhost:3000"," http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def save_schema(data,filename="directions_schema.json"):
    builder = SchemaBuilder()
    builder.add_object(data)
    schema = builder.to_schema()  
    with open(filename,"w",encoding='utf-8') as f:
        json.dump(schema,f,indent=2)



@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/routes")
async def get_routes(origin, destination, mode):
    
    valid_modes = {"driving", "walking", "bicycling", "transit", "two_wheeler"}
    if mode not in valid_modes:
        mode = "driving"
    try:
        directions = gmaps.directions(origin, destination, mode=mode,alternatives=True)
    except Exception as e:
        return {"error":f"Failed to fetch directions:{e}"}  
    if not directions:
        return []
    
    routes = []
    
    num = 1
    save_schema(directions)
    for route in directions:
        encoded_polyline = route['overview_polyline']['points']#Get the polyline
        
        # Get the first leg of the journey for total distance/duration
        if route['legs']:
            leg = route['legs'][0]
            
            # 3. Extract distance and duration from the leg
            distance_text = leg['distance']['text']
            duration_text = leg['duration']['text']
            
            routes.append({
                "distance": distance_text,
                "duration": duration_text,
                "polyline": encoded_polyline,
                "summary": route.get('summary', 'Direct Route') #  descriptive summary
            })
    return routes

#resolve coordinate to a km^2 grid 

def get_grid_key(lat: float, lon: float, grid_km: float = 1.0) -> str:
    """Convert lat/lon into roughly 1 km² grid cell key."""
    deg_per_km_lat = 1 / 111.32
    deg_per_km_lon = 1 / (111.32 * math.cos(math.radians(lat)))
    lat_step = deg_per_km_lat * grid_km
    lon_step = deg_per_km_lon * grid_km
    grid_lat = round(lat / lat_step) * lat_step
    grid_lon = round(lon / lon_step) * lon_step
    return f"{grid_lat:.4f},{grid_lon:.4f}"

async def fetch_weather(lat: float, lon: float):
    """Fetch fresh weather data from Open-Meteo."""
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            meteo_url,
            params={
                "latitude": lat,
                "longitude": lon,
                "current_weather": "true",
                "temperature_unit": "fahrenheit",
                "timezone": "America/Chicago"
            }
        )
        response.raise_for_status()
        return response.json()

@app.get("/weather")
async def get_weather(lat: float, lon: float):
    #  Create grid key for ~1 km² area
    grid_key = get_grid_key(lat, lon)

    #  Check Redis for cached data
    cached = await redis_client.get(grid_key)
    if cached:
        print(f"Cache hit for {grid_key}")
        return json.loads(cached)

    # Otherwise fetch from API and store
    print(f"Cache miss for {grid_key}, fetching new data...")
    try:
        data = await fetch_weather(lat, lon)
        # Cache result for 10 minutes (600s)
        await redis_client.set(grid_key, json.dumps(data), ex=3600)
        return data
    except httpx.TimeoutException:
        return {"status": "error", "message": "Weather API request timed out."}
    except httpx.RequestError as e:
        return {"status": "error", "message": f"Network error: {e}"}
    except httpx.HTTPStatusError as e:
        return {"status": "error", "message": f"HTTP {e.response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected: {str(e)}"}
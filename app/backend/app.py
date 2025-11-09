from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os,requests
import googlemaps
from dotenv import load_dotenv
import polyline
import json
from genson import SchemaBuilder

load_dotenv()
app = FastAPI()
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))

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



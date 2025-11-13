from fastapi import FastAPI, HTTPException
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
import random
from collections import defaultdict
from typing import List, Tuple, Dict, Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import getpass


load_dotenv()
app = FastAPI()
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))
redis_client = redis.from_url("redis://localhost:6379",decode_responses=True)

meteo_url = "https://api.open-meteo.com/v1/forecast"
overpass_url = "https://overpass-api.de/api/interpreter"

# -------------------------------
# Database connection setup
# -------------------------------
USE_LOCAL = os.getenv("USE_LOCAL_DB", "true").lower() == "true"

if USE_LOCAL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "accinet")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "")
else:
    DB_HOST = os.getenv("SUPABASE_DB_HOST", "db.supabase.co")
    DB_PORT = int(os.getenv("SUPABASE_DB_PORT", "5432"))
    DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
    DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
    DB_PASS = os.getenv("SUPABASE_DB_PASS", "")
    if not DB_PASS:
        raise ValueError("Missing SUPABASE_DB_PASS in .env when using Supabase")

# Global database engine and session factory
db_engine = None
async_session_maker = None

def get_db_engine():
    """Get or create database async engine."""
    global db_engine, async_session_maker
    if db_engine is None:
        # For local connections without password, use system user for peer authentication
        db_user = DB_USER
        if USE_LOCAL and not DB_PASS:
            system_user = getpass.getuser()
            if DB_USER == "postgres" and system_user != "postgres":
                db_user = system_user
        
        # Build connection string
        # Note: asyncpg doesn't support Unix sockets directly, so we need TCP/IP
        # For local connections without password, we'll use 'trust' authentication
        # or the user needs to set up password authentication
        if USE_LOCAL and not DB_PASS:
            # Try TCP/IP connection - may require password or trust authentication
            # If this fails, user should either:
            # 1. Set DB_PASS in .env
            # 2. Configure PostgreSQL pg_hba.conf to allow trust authentication for localhost
            db_url = f"postgresql+asyncpg://{db_user}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        elif DB_PASS:
            # TCP/IP connection with password
            db_url = f"postgresql+asyncpg://{db_user}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        else:
            # TCP/IP connection without password
            db_url = f"postgresql+asyncpg://{db_user}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        
        # Create engine with connection arguments
        connect_args = {}
        if USE_LOCAL and not DB_PASS:
            # For local connections, try to use Unix socket if possible
            # This is a workaround - asyncpg doesn't support Unix sockets well
            # So we'll try TCP/IP and hope trust auth is configured
            pass
        
        db_engine = create_async_engine(
            db_url,
            pool_size=5,
            max_overflow=10,
            echo=False,
            connect_args=connect_args
        )
        async_session_maker = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    return db_engine

@app.on_event("startup")
async def startup_event():
    """Initialize database engine on startup."""
    try:
        engine = get_db_engine()
        # Test connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("✅ Database connection pool initialized")
    except Exception as e:
        error_msg = str(e)
        print(f"⚠️  Warning: Could not initialize database pool: {error_msg}")
        if "password authentication failed" in error_msg.lower() or "authentication failed" in error_msg.lower():
            print("\n💡 To fix this, you have two options:")
            print("   1. Set a password in your .env file:")
            print("      DB_PASS=your_password")
            print("   2. Configure PostgreSQL to allow passwordless TCP/IP connections:")
            print("      Edit /etc/postgresql/*/main/pg_hba.conf and add:")
            print("      host    all    all    127.0.0.1/32    trust")
            print("      Then restart PostgreSQL: sudo systemctl restart postgresql")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database engine on shutdown."""
    global db_engine
    if db_engine:
        await db_engine.dispose()
        print("✅ Database connection pool closed")


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
'''
@app.get("/street")
async def get_street(street_lat,street_lon):
    )
'''
@app.get("/routes")
async def get_routes(origin, destination, mode):
    
    valid_modes = {"driving", "walking", "bicycling", "transit", "two_wheeler"}
    if mode not in valid_modes:
        mode = "driving"
    try:
        directions = gmaps.directions(origin, destination, mode=mode,alternatives=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch directions: {str(e)}")
    
    if not directions:
        return []
    
    routes = []
    
    num = 1
    save_schema(directions)
    for route in directions:
        try:
            encoded_polyline = route['overview_polyline']['points']#Get the polyline
            
            # Decode polyline to get coordinate points
            decoded_coords = polyline.decode(encoded_polyline)
            
            # Generate random values (0.0-1.0) for each coordinate point
            values = [random.random() for _ in decoded_coords]
            
            # Get weather and road conditions for each coordinate
            conditions = await get_route_conditions(encoded_polyline)
            
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
                    "summary": route.get('summary', 'Direct Route'), #  descriptive summary
                    "values": values,  # Random values for gradient visualization
                    "conditions": conditions  # Weather and road conditions
                })
        except Exception as e:
            print(f"Error processing route: {e}")
            # Continue with other routes even if one fails
            continue
    
    if not routes:
        raise HTTPException(status_code=500, detail="Failed to process any routes")
    
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

def cluster_coordinates(coords: List[Tuple[float, float]], cluster_distance_km: float = 0.5) -> Dict[str, List[Tuple[float, float]]]:
    """
    Cluster coordinates into groups based on proximity to reduce API calls.
    Returns a dict mapping cluster keys to lists of coordinates in that cluster.
    """
    clusters = defaultdict(list)
    
    for lat, lon in coords:
        # Use grid key for clustering (same as weather caching)
        cluster_key = get_grid_key(lat, lon, grid_km=cluster_distance_km)
        clusters[cluster_key].append((lat, lon))
    
    return clusters

def get_bounding_box(coords: List[Tuple[float, float]]) -> Tuple[float, float, float, float]:
    """Get bounding box (south, west, north, east) for a list of coordinates."""
    lats = [lat for lat, lon in coords]
    lons = [lon for lat, lon in coords]
    return (min(lats), min(lons), max(lats), max(lons))

async def fetch_road_data_db(south: float, west: float, north: float, east: float) -> List[Dict]:
    """
    Fetch road data from local PostGIS database for a bounding box.
    Returns a list of road records with geometry and attributes.
    """
    try:
        engine = get_db_engine()
        async with engine.begin() as conn:
            # Query roads within bounding box using PostGIS
            # ST_Intersects with a bounding box polygon
            query = text("""
            SELECT 
                osm_id,
                code,
                fclass,
                name,
                ref,
                oneway,
                maxspeed,
                layer,
                bridge,
                tunnel,
                ST_AsGeoJSON(geom)::json as geometry
            FROM roads
            WHERE geom && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
            LIMIT 1000
            """)
            
            result = await conn.execute(query, {
                "west": west,
                "south": south,
                "east": east,
                "north": north
            })
            rows = result.fetchall()
            
            # Convert to list of dicts similar to OSM format
            roads = []
            for row in rows:
                # Parse GeoJSON geometry to extract coordinates
                # GeoJSON format is [lon, lat], we need [lat, lon] for our distance calculations
                geom_data = row.geometry if hasattr(row, 'geometry') else row[11]
                coords = []
                if geom_data and isinstance(geom_data, dict):
                    if geom_data.get('type') == 'LineString':
                        # GeoJSON: [lon, lat] -> convert to [lat, lon]
                        coords = [[coord[1], coord[0]] for coord in geom_data.get('coordinates', [])]
                    elif geom_data.get('type') == 'MultiLineString':
                        for linestring in geom_data.get('coordinates', []):
                            # GeoJSON: [lon, lat] -> convert to [lat, lon]
                            coords.extend([[coord[1], coord[0]] for coord in linestring])
                
                road = {
                    'osm_id': row.osm_id if hasattr(row, 'osm_id') else row[0],
                    'fclass': row.fclass if hasattr(row, 'fclass') else row[2],
                    'name': row.name if hasattr(row, 'name') else row[3],
                    'ref': row.ref if hasattr(row, 'ref') else row[4],
                    'oneway': row.oneway if hasattr(row, 'oneway') else row[5],
                    'maxspeed': row.maxspeed if hasattr(row, 'maxspeed') else row[6],
                    'bridge': row.bridge if hasattr(row, 'bridge') else row[8],
                    'tunnel': row.tunnel if hasattr(row, 'tunnel') else row[9],
                    'geometry': coords
                }
                roads.append(road)
            
            return roads
    except Exception as e:
        print(f"Error fetching road data from database: {e}")
        import traceback
        traceback.print_exc()
        return []

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula (in km)."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def extract_road_info(roads: List[Dict], target_lat: float, target_lon: float) -> Dict:
    """
    Extract road condition/description from database road data for the nearest road to target coordinates.
    """
    if not roads:
        return {
            "surface": "unknown",
            "road_type": "unknown",
            "condition": "unknown",
            "name": "Unknown Road"
        }
    
    # Find nearest road
    min_distance = float('inf')
    nearest_road = None
    
    for road in roads:
        geometry = road.get("geometry", [])
        if not geometry:
            continue
        
        # Calculate distance to nearest point on the road geometry
        for point in geometry:
            if len(point) >= 2:
                road_lat = point[0]  # First element is lat
                road_lon = point[1]   # Second element is lon
                # Use Haversine for more accurate distance
                distance = haversine_distance(target_lat, target_lon, road_lat, road_lon)
                if distance < min_distance:
                    min_distance = distance
                    nearest_road = road
                    break
    
    if not nearest_road:
        return {
            "surface": "unknown",
            "road_type": "unknown",
            "condition": "unknown",
            "name": "Unknown Road"
        }
    
    # Extract road information from database columns
    road_type = nearest_road.get("fclass", "unknown")
    name = nearest_road.get("name") or nearest_road.get("ref") or "Unnamed Road"
    
    # Determine condition based on road class
    # fclass values like: motorway, primary, secondary, tertiary, residential, etc.
    condition = "good"
    if road_type in ["track", "path", "footway", "cycleway"]:
        condition = "poor"
    elif road_type in ["motorway", "primary", "secondary", "tertiary", "residential"]:
        condition = "good"
    else:
        # Default to good for most road types
        condition = "good"
    
    # Surface is not in the database schema, so we'll infer from road type
    surface = "asphalt" if condition == "good" else "unknown"
    
    return {
        "surface": surface,
        "road_type": road_type,
        "condition": condition,
        "name": name
    }

async def get_route_conditions(encoded_polyline: str, sample_interval: int = 8) -> List[Dict]:
    """
    Get weather and road conditions for each coordinate in a polyline.
    Samples coordinates to reduce API calls (every Nth coordinate, default 8).
    Uses a single OSM request for the entire route to minimize API calls.
    """
    # Decode polyline
    coords = polyline.decode(encoded_polyline)
    if not coords:
        return []
    
    # Get bounding box for entire route
    lats = [lat for lat, lon in coords]
    lons = [lon for lat, lon in coords]
    south = min(lats)
    north = max(lats)
    west = min(lons)
    east = max(lons)
    
    # Add padding to bounding box (about 1km)
    padding = 0.01
    south -= padding
    north += padding
    west -= padding
    east += padding
    
    # Create a single cache key for the entire route bounding box
    route_bbox_key = f"route_bbox:{south:.4f},{west:.4f},{north:.4f},{east:.4f}"
    
    # Try to get cached road data for entire route
    cached_road = await redis_client.get(route_bbox_key)
    if cached_road:
        print(f"Cache hit for route bounding box: {route_bbox_key}")
        roads_data = json.loads(cached_road)
    else:
        print(f"Cache miss for route bounding box, fetching road data from database for entire route...")
        try:
            # Query database for roads in bounding box
            roads_data = await fetch_road_data_db(south, west, north, east)
            
            # Cache for 24 hours
            await redis_client.set(route_bbox_key, json.dumps(roads_data), ex=86400)
            print(f"Cached road data for route bounding box ({len(roads_data)} roads)")
        except Exception as e:
            print(f"Error fetching road data from database: {e}")
            roads_data = []
    
    # Sample coordinates: always include first and last, then every Nth coordinate
    num_coords = len(coords)
    sampled_indices = set()
    
    # Always include first and last
    sampled_indices.add(0)
    sampled_indices.add(num_coords - 1)
    
    # Sample every Nth coordinate
    for i in range(0, num_coords, sample_interval):
        sampled_indices.add(i)
    
    # Sort indices for easier processing
    sampled_indices = sorted(sampled_indices)
    
    print(f"Sampling {len(sampled_indices)} of {num_coords} coordinates (interval: {sample_interval})")
    
    # Fetch conditions only for sampled coordinates
    sampled_conditions = {}
    weather_cache = {}
    
    for idx in sampled_indices:
        lat, lon = coords[idx]
        
        # Get weather (uses existing grid-based caching)
        weather_key = get_grid_key(lat, lon)
        if weather_key not in weather_cache:
            cached_weather = await redis_client.get(f"weather:{weather_key}")
            if cached_weather:
                weather_cache[weather_key] = json.loads(cached_weather)
            else:
                try:
                    weather_data = await fetch_weather(lat, lon)
                    weather_cache[weather_key] = weather_data
                    await redis_client.set(f"weather:{weather_key}", json.dumps(weather_data), ex=3600)
                except Exception as e:
                    weather_cache[weather_key] = {"error": str(e)}
        weather = weather_cache[weather_key]
        
        # Extract road info for this specific coordinate from the database results
        road_info = extract_road_info(roads_data, lat, lon)
        
        # Store condition for this sampled coordinate
        sampled_conditions[idx] = {
            "lat": lat,
            "lon": lon,
            "weather": weather,
            "road": road_info
        }
    
    # Build results array: reuse conditions from nearest sampled point
    results = []
    for idx, (lat, lon) in enumerate(coords):
        # Find nearest sampled index
        nearest_sampled_idx = min(sampled_indices, key=lambda x: abs(x - idx))
        condition = sampled_conditions[nearest_sampled_idx].copy()
        
        # Update lat/lon to match actual coordinate (for accurate display)
        condition["lat"] = lat
        condition["lon"] = lon
        
        results.append(condition)
    
    return results
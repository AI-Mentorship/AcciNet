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
import asyncio


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
            pool_size=10,  # Increased for parallel queries (read-only, safe to have more connections)
            max_overflow=20,  # Increased for handling bursts of parallel queries
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
async def fetch_google_routes(origin: str, destination: str, mode: str) -> List[Dict]:
    """Fetch routes from Google Maps API. Returns raw route data."""
    valid_modes = {"driving", "walking", "bicycling", "transit", "two_wheeler"}
    if mode not in valid_modes:
        mode = "driving"
    
    try:
        directions = gmaps.directions(origin, destination, mode=mode, alternatives=True)
        return directions if directions else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch directions: {str(e)}")


async def fetch_weather_for_coords(coords: List[Tuple[float, float]], sample_interval: int = 8) -> Dict[str, Dict]:
    """
    Fetch weather data for sampled coordinates asynchronously.
    Returns dict mapping grid_key -> weather_data.
    """
    if not coords:
        return {}
    
    # Sample coordinates
    sampled_indices = set()
    sampled_indices.add(0)
    sampled_indices.add(len(coords) - 1)
    for i in range(0, len(coords), sample_interval):
        sampled_indices.add(i)
    
    # Group sampled coordinates by 1km weather grid cells
    weather_grid_map = defaultdict(list)
    for idx in sorted(sampled_indices):
        lat, lon = coords[idx]
        weather_key = get_grid_key(lat, lon, grid_km=1.0)
        weather_grid_map[weather_key].append((lat, lon))
    
    weather_cache = {}
    weather_tasks = []
    
    # Check cache and prepare fetch tasks
    for weather_key, coord_list in weather_grid_map.items():
        cached_weather = await redis_client.get(f"weather:{weather_key}")
        if cached_weather:
            weather_cache[weather_key] = json.loads(cached_weather)
        else:
            grid_lat, grid_lon = map(float, weather_key.split(','))
            weather_tasks.append((weather_key, grid_lat, grid_lon))
    
    # Fetch uncached weather in parallel
    if weather_tasks:
        async def fetch_weather_task(weather_key, grid_lat, grid_lon):
            weather_data = await fetch_weather(grid_lat, grid_lon, use_grid=False)
            await redis_client.set(f"weather:{weather_key}", json.dumps(weather_data), ex=3600)
            return weather_key, weather_data
        
        weather_results = await asyncio.gather(
            *[fetch_weather_task(key, lat, lon) for key, lat, lon in weather_tasks],
            return_exceptions=True
        )
        
        for result in weather_results:
            if isinstance(result, Exception):
                continue
            weather_key, weather_data = result
            weather_cache[weather_key] = weather_data
    
    return weather_cache


async def fetch_roads_for_coords(coords: List[Tuple[float, float]], sample_interval: int = 8) -> List[Optional[Dict]]:
    """
    Fetch road data for sampled coordinates asynchronously.
    Returns list of road info dicts (one per sampled coordinate).
    """
    if not coords:
        return []
    
    # Sample coordinates
    sampled_indices = set()
    sampled_indices.add(0)
    sampled_indices.add(len(coords) - 1)
    for i in range(0, len(coords), sample_interval):
        sampled_indices.add(i)
    
    sampled_coords = [coords[idx] for idx in sorted(sampled_indices)]
    print(f"[fetch_roads_for_coords] Fetching roads for {len(sampled_coords)} sampled coordinates")
    
    # Fetch roads for all sampled coordinates in parallel
    # Increase search radius to 0.5km to ensure we find roads
    nearest_roads = await fetch_nearest_roads_for_coords(sampled_coords, search_radius_km=0.5)
    
    # Format road info
    road_info_list = []
    found_count = 0
    for idx, road in enumerate(nearest_roads):
        if road and isinstance(road, dict):
            # Extract road data from database result
            road_type = road.get("fclass")
            name = road.get("name")
            ref = road.get("ref")
            
            # Use ref if name is not available
            if not name and ref:
                name = ref
            if not name:
                name = "Unnamed Road"
            
            # Default to "unknown" if fclass is missing
            if not road_type:
                road_type = "unknown"
            
            condition = "poor" if road_type in ["track", "path", "footway", "cycleway"] else "good"
            
            road_info_list.append({
                "surface": "asphalt" if condition == "good" else "unknown",
                "road_type": road_type,
                "condition": condition,
                "name": name
            })
            found_count += 1
        else:
            # No road found for this coordinate
            lat, lon = sampled_coords[idx] if idx < len(sampled_coords) else (0, 0)
            print(f"[fetch_roads_for_coords] No road found for coordinate ({lat:.5f}, {lon:.5f})")
            road_info_list.append({
                "surface": "unknown",
                "road_type": "unknown",
                "condition": "unknown",
                "name": "Unknown Road"
            })
    
    print(f"[fetch_roads_for_coords] Found roads for {found_count}/{len(sampled_coords)} coordinates")
    return road_info_list


async def get_sampled_conditions(encoded_polyline: str, sample_interval: int = 8) -> List[Dict]:
    """
    Get weather and road conditions for sampled coordinates only.
    Returns minimal condition data for sampled points.
    """
    coords = polyline.decode(encoded_polyline)
    if not coords:
        return []
    
    # Sample coordinates
    sampled_indices = sorted(set([0, len(coords) - 1] + list(range(0, len(coords), sample_interval))))
    sampled_coords = [(coords[idx][0], coords[idx][1]) for idx in sampled_indices]
    
    # Fetch weather and roads in parallel
    weather_cache, nearest_roads = await asyncio.gather(
        fetch_weather_for_coords(coords, sample_interval),
        fetch_roads_for_coords(coords, sample_interval),
        return_exceptions=True
    )
    
    # Handle errors gracefully
    if isinstance(weather_cache, Exception):
        print(f"Error fetching weather: {weather_cache}")
        weather_cache = {}
    if isinstance(nearest_roads, Exception):
        print(f"Error fetching roads: {nearest_roads}")
        nearest_roads = []
    
    # Build minimal condition objects for sampled points only
    conditions = []
    for idx, (lat, lon) in enumerate(sampled_coords):
        weather_key = get_grid_key(lat, lon, grid_km=1.0)
        weather = weather_cache.get(weather_key, {})
        road = nearest_roads[idx] if idx < len(nearest_roads) else {
            "surface": "unknown", "road_type": "unknown", "condition": "unknown", "name": "Unknown Road"
        }
        
        # Minimal condition object - only essential data (full key names for maintainability)
        conditions.append({
            "lat": round(lat, 5),  # Reduce precision to save space
            "lon": round(lon, 5),
            "weathercode": weather.get("current_weather", {}).get("weathercode"),
            "temperature": weather.get("current_weather", {}).get("temperature"),
            "road_type": road.get("road_type"),
            "road_name": road.get("name")
        })
    
    return conditions


@app.get("/routes")
async def get_routes(origin, destination, mode):
    """
    Get routes from Google Maps API with optional sampled conditions.
    Route fetching happens first, then conditions are fetched asynchronously.
    """
    # Step 1: Fetch routes from Google Maps (synchronous API call)
    directions = await fetch_google_routes(origin, destination, mode)
    
    if not directions:
        return []
    
    max_routes = min(3, len(directions))
    routes = []
    
    # Step 2: Process each route
    for route_idx, route in enumerate(directions[:max_routes]):
        try:
            encoded_polyline = route['overview_polyline']['points']
            decoded_coords = polyline.decode(encoded_polyline)
            
            if not decoded_coords:
                continue
            
            if not route.get('legs'):
                continue
            
            leg = route['legs'][0]
            
            # Build base route data (fast)
            route_data = {
                "distance": leg['distance']['text'],
                "duration": leg['duration']['text'],
                "polyline": encoded_polyline,
                "summary": route.get('summary', 'Direct Route'),
                "values": [random.random() for _ in decoded_coords],  # Risk values for gradient
            }
            
            # Step 3: Fetch conditions asynchronously (only sampled points)
            try:
                conditions = await get_sampled_conditions(encoded_polyline, sample_interval=8)
                route_data["conditions"] = conditions
            except Exception as e:
                print(f"Warning: Failed to get conditions for route {route_idx + 1}: {e}")
                route_data["conditions"] = []
            
            routes.append(route_data)
                
        except Exception as e:
            print(f"Error processing route {route_idx + 1}: {e}")
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

def get_road_grid_key(lat: float, lon: float) -> str:
    """Convert lat/lon into 500m x 500m grid cell key for road caching."""
    return get_grid_key(lat, lon, grid_km=0.5)

async def fetch_weather(lat: float, lon: float, use_grid: bool = True) -> Dict:
    """
    Fetch fresh weather data from Open-Meteo.
    Uses 1km grid cell center coordinates to maximize cache hits.
    Returns format matching frontend RouteCondition.weather interface:
    { current_weather?: { temperature?, weathercode?, windspeed? }, error?: string }
    
    Parameters:
    - lat, lon: Coordinate (will be snapped to grid center if use_grid=True)
    - use_grid: If True, uses 1km grid cell center for API call (default: True)
    """
    try:
        # Snap to 1km grid cell center for better caching
        if use_grid:
            grid_key = get_grid_key(lat, lon, grid_km=1.0)
            # Parse grid center coordinates from grid key
            grid_lat, grid_lon = map(float, grid_key.split(','))
            # Use grid center for API call
            api_lat, api_lon = grid_lat, grid_lon
        else:
            api_lat, api_lon = lat, lon
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                meteo_url,
                params={
                    "latitude": api_lat,
                    "longitude": api_lon,
                    "current_weather": "true",
                    "temperature_unit": "fahrenheit",
                    "timezone": "America/Chicago"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Format to match frontend expectations
            # Frontend expects: { current_weather?: { temperature?, weathercode?, windspeed? }, error?: string }
            if 'current_weather' in data:
                current = data['current_weather']
                return {
                    "current_weather": {
                        "temperature": current.get('temperature'),
                        "weathercode": current.get('weathercode'),
                        "windspeed": current.get('windspeed')
                    }
                }
            else:
                return {"error": "No current weather data available"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/routes/segment")
async def get_route_segment_from_coord(lat: float, lon: float, polyline: str):
    """
    Get road and weather information for a clicked coordinate on a route.
    Finds the nearest segment in the route polyline and returns its condition data.
    
    Note: Routes already include condition data in the /routes response.
    This endpoint is useful for refreshing data or getting more detailed info on-demand.
    
    Parameters:
    - lat, lon: Clicked coordinate
    - polyline: Encoded polyline of the route
    
    Returns format: { road: {...}, weather: {...} }
    """
    try:
        # Decode polyline to get route coordinates
        route_coords = polyline.decode(polyline)
        if not route_coords:
            raise HTTPException(status_code=400, detail="Invalid polyline")
        
        # Find nearest coordinate in the route
        min_distance = float('inf')
        nearest_idx = 0
        
        for idx, (route_lat, route_lon) in enumerate(route_coords):
            distance = haversine_distance(lat, lon, route_lat, route_lon)
            if distance < min_distance:
                min_distance = distance
                nearest_idx = idx
        
        # If click is too far from route (> 100m), fall back to database lookup
        if min_distance > 0.1:  # 100 meters
            return await get_road_info(lat, lon)
        
        # Get conditions for this route
        # Use smaller sample interval to get more accurate data for clicked point
        conditions = await get_route_conditions(polyline, sample_interval=4)
        
        if not conditions or nearest_idx >= len(conditions):
            # Fall back to database lookup
            return await get_road_info(lat, lon)
        
        # Get condition for nearest coordinate
        condition = conditions[nearest_idx]
        
        # Format response matching frontend expectations
        road_info = condition.get('road', {})
        weather_info = condition.get('weather', {})
        
        # Format weather for frontend popup
        weather_formatted = {}
        if 'current_weather' in weather_info:
            current = weather_info['current_weather']
            weather_formatted = {
                "summary": f"Temperature: {current.get('temperature', 'N/A')}°F",
                "temperature": current.get('temperature'),
                "windspeed": current.get('windspeed'),
                "time": None
            }
        elif 'error' in weather_info:
            weather_formatted = {
                "summary": f"Weather unavailable: {weather_info['error']}",
                "temperature": None,
                "windspeed": None,
                "time": None
            }
        
        # Format road info
        road_formatted = {
            "name": road_info.get('name'),
            "road_type": road_info.get('road_type'),
            "maxspeed": None,  # Not in condition data
            "oneway": None,
            "surface": road_info.get('surface'),
            "condition": road_info.get('condition')
        }
        
        return {
            "road": road_formatted,
            "weather": weather_formatted
        }
    except Exception as e:
        print(f"Error fetching route segment info: {e}")
        import traceback
        traceback.print_exc()
        # Fall back to regular road info lookup
        return await get_road_info(lat, lon)

@app.get("/roads/info")
async def get_road_info(lat: float, lon: float):
    """
    Get road and weather information for a specific coordinate.
    This is a fallback endpoint for clicking on areas not on a route.
    For route segments, use /routes/segment with the route's polyline instead.
    
    Returns format: { road: {...}, weather: {...} }
    """
    try:
        # Get bounding box around the point (small area, ~500m)
        padding = 0.005  # ~500m
        south = lat - padding
        north = lat + padding
        west = lon - padding
        east = lon + padding
        
        # Fetch roads in small area
        roads_data = await fetch_road_data_db(south, west, north, east)
        
        # Extract road info for this coordinate
        road_info = extract_road_info(roads_data, lat, lon)
        
        # Get weather for this coordinate (uses grid center for caching)
        weather_data = await fetch_weather(lat, lon, use_grid=True)
        
        # Format weather for frontend popup
        # Frontend expects: { summary, temperature, windspeed, time }
        weather_formatted = {}
        if 'current_weather' in weather_data:
            current = weather_data['current_weather']
            weather_formatted = {
                "summary": f"Temperature: {current.get('temperature', 'N/A')}°F",
                "temperature": current.get('temperature'),
                "windspeed": current.get('windspeed'),
                "time": None  # Could add timestamp if available
            }
        elif 'error' in weather_data:
            weather_formatted = {
                "summary": f"Weather unavailable: {weather_data['error']}",
                "temperature": None,
                "windspeed": None,
                "time": None
            }
        
        # Format road info for frontend popup
        # Frontend expects: { name, road_type, maxspeed, oneway, surface, condition }
        road_formatted = {
            "name": road_info.get('name'),
            "road_type": road_info.get('road_type'),
            "maxspeed": None,  # Not in our road_info, would need to get from roads_data
            "oneway": None,     # Not in our road_info, would need to get from roads_data
            "surface": road_info.get('surface'),
            "condition": road_info.get('condition')
        }
        
        # Try to get maxspeed and oneway from nearest road if available
        if roads_data:
            nearest_road = None
            min_distance = float('inf')
            for road in roads_data:
                geometry = road.get("geometry", [])
                if not geometry:
                    continue
                for point in geometry:
                    if len(point) >= 2:
                        road_lat = point[0]
                        road_lon = point[1]
                        distance = haversine_distance(lat, lon, road_lat, road_lon)
                        if distance < min_distance:
                            min_distance = distance
                            nearest_road = road
                            break
            
            if nearest_road:
                road_formatted["maxspeed"] = nearest_road.get('maxspeed')
                road_formatted["oneway"] = nearest_road.get('oneway')
        
        return {
            "road": road_formatted,
            "weather": weather_formatted
        }
    except Exception as e:
        print(f"Error fetching road info: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch road info: {str(e)}")

@app.get("/weather")
async def get_weather(lat: float, lon: float):
    """
    Get weather data for a coordinate.
    Uses 1km grid cell center for API calls to maximize cache hits.
    """
    # Create grid key for ~1 km² area
    grid_key = get_grid_key(lat, lon, grid_km=1.0)
    cache_key = f"weather:{grid_key}"

    # Check Redis for cached data
    cached = await redis_client.get(cache_key)
    if cached:
        print(f"Cache hit for weather grid {grid_key}")
        return json.loads(cached)

    # Otherwise fetch from API using grid center coordinates
    print(f"Cache miss for weather grid {grid_key}, fetching new data...")
    try:
        # fetch_weather will automatically use grid center coordinates
        data = await fetch_weather(lat, lon, use_grid=True)
        # Cache result for 1 hour
        await redis_client.set(cache_key, json.dumps(data), ex=3600)
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

async def fetch_nearest_road_for_coord(lat: float, lon: float, search_radius_km: float = 0.1, conn=None) -> Optional[Dict]:
    """
    Find nearest road for a single coordinate using PostGIS spatial query.
    This is used as a helper function for parallel processing.
    """
    try:
        if conn is None:
            engine = get_db_engine()
            async with engine.begin() as conn:
                return await _fetch_nearest_road_query(lat, lon, search_radius_km, conn)
        else:
            return await _fetch_nearest_road_query(lat, lon, search_radius_km, conn)
    except Exception as e:
        print(f"Error fetching nearest road for ({lat}, {lon}): {e}")
        return None

async def _fetch_nearest_road_query(lat: float, lon: float, search_radius_km: float, conn) -> Optional[Dict]:
    """Internal helper to execute the PostGIS query for a single coordinate."""
    radius_meters = search_radius_km * 1000
    
    # Use geography casting for accurate distance calculations in meters
    query = text("""
    SELECT 
        osm_id,
        fclass,
        name,
        ref,
        oneway,
        maxspeed,
        bridge,
        tunnel,
        ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
        ) as distance_meters
    FROM roads
    WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
        :radius_meters
    )
    ORDER BY distance_meters
    LIMIT 1
    """)
    
    result = await conn.execute(query, {
        "lat": lat,
        "lon": lon,
        "radius_meters": radius_meters
    })
    row = result.fetchone()
    
    if row:
        try:
            # Access columns by name or index
            osm_id = row.osm_id if hasattr(row, 'osm_id') else row[0]
            fclass = row.fclass if hasattr(row, 'fclass') else row[1]
            name = row.name if hasattr(row, 'name') else row[2]
            ref = row.ref if hasattr(row, 'ref') else row[3]
            oneway = row.oneway if hasattr(row, 'oneway') else row[4]
            maxspeed = row.maxspeed if hasattr(row, 'maxspeed') else row[5]
            bridge = row.bridge if hasattr(row, 'bridge') else row[6]
            tunnel = row.tunnel if hasattr(row, 'tunnel') else row[7]
        except (IndexError, AttributeError):
            try:
                row_dict = dict(row._mapping) if hasattr(row, '_mapping') else {}
                osm_id = row_dict.get('osm_id')
                fclass = row_dict.get('fclass')
                name = row_dict.get('name')
                ref = row_dict.get('ref')
                oneway = row_dict.get('oneway')
                maxspeed = row_dict.get('maxspeed')
                bridge = row_dict.get('bridge')
                tunnel = row_dict.get('tunnel')
            except:
                return None
        
        return {
            'osm_id': osm_id,
            'fclass': fclass,
            'name': name,
            'ref': ref,
            'oneway': oneway,
            'maxspeed': maxspeed,
            'bridge': bridge,
            'tunnel': tunnel
        }
    return None

async def fetch_nearest_roads_for_coords(coords: List[Tuple[float, float]], search_radius_km: float = 0.1) -> List[Dict]:
    """
    Efficiently find nearest road for each coordinate using PostGIS spatial queries.
    Uses grid-based caching (500m x 500m cells) and parallel database queries.
    
    Parameters:
    - coords: List of (lat, lon) tuples
    - search_radius_km: Search radius in kilometers (default 100m)
    
    Returns: List of road info dicts, one per coordinate (None if no road found)
    """
    if not coords:
        return []
    
    try:
        # Group coordinates by 500m grid cells for caching
        grid_coords_map = defaultdict(list)  # grid_key -> [(coord_idx, lat, lon), ...]
        coord_to_grid = {}  # coord_idx -> grid_key
        
        for idx, (lat, lon) in enumerate(coords):
            grid_key = get_road_grid_key(lat, lon)
            grid_coords_map[grid_key].append((idx, lat, lon))
            coord_to_grid[idx] = grid_key
        
        # Check Redis cache for each grid cell
        cached_results = {}
        uncached_coords = []  # List of (coord_idx, lat, lon, grid_key)
        
        for grid_key, coord_list in grid_coords_map.items():
            cache_key = f"road_grid:{grid_key}"
            cached = await redis_client.get(cache_key)
            
            if cached:
                # Cache hit - use cached road data for this grid cell
                cached_road = json.loads(cached)  # Returns None if cached value was None
                for coord_idx, lat, lon in coord_list:
                    cached_results[coord_idx] = cached_road
            else:
                # Cache miss - need to query database
                # Use the first coordinate in the grid cell as representative
                # (all coordinates in same 500m cell will get same road)
                first_coord = coord_list[0]
                uncached_coords.append((first_coord[0], first_coord[1], first_coord[2], grid_key))
        
        # Fetch uncached coordinates in parallel using asyncio with concurrency limit
        if uncached_coords:
            print(f"Cache miss for {len(uncached_coords)} grid cells, querying database in parallel...")
            
            engine = get_db_engine()
            # Limit concurrent database connections to avoid exhausting the pool
            # Use semaphore to limit to 8 concurrent connections (leaving room for other operations)
            semaphore = asyncio.Semaphore(8)
            
            # Run queries in parallel using separate connections from the pool
            # Since database is read-only, parallel queries are safe
            # Use connect() instead of begin() for read-only queries (no transaction overhead)
            async def fetch_with_connection(coord_idx, lat, lon, grid_key):
                async with semaphore:  # Limit concurrent connections
                    async with engine.connect() as conn:
                        # Read-only query, no transaction needed
                        result = await _fetch_nearest_road_query(lat, lon, search_radius_km, conn)
                        return result
            
            # Create tasks for parallel execution
            tasks = [
                fetch_with_connection(coord_idx, lat, lon, grid_key)
                for coord_idx, lat, lon, grid_key in uncached_coords
            ]
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results and cache by grid cell
            for (coord_idx, lat, lon, grid_key), result in zip(uncached_coords, query_results):
                if isinstance(result, Exception):
                    print(f"Error in parallel query for ({lat}, {lon}): {result}")
                    road_data = None
                else:
                    road_data = result
                
                # Cache the result for this grid cell (24 hour TTL)
                cache_key = f"road_grid:{grid_key}"
                if road_data:
                    await redis_client.set(cache_key, json.dumps(road_data), ex=86400)
                else:
                    # Cache None result too (shorter TTL to allow retry)
                    await redis_client.set(cache_key, json.dumps(None), ex=3600)
                
                # Assign result to all coordinates in this grid cell
                for grid_coord_idx, grid_lat, grid_lon in grid_coords_map[grid_key]:
                    cached_results[grid_coord_idx] = road_data
        
        # Build results list in original coordinate order
        results = [cached_results.get(idx) for idx in range(len(coords))]
        
        # Count cache hits/misses by unique grid cells
        total_grid_cells = len(grid_coords_map)
        cache_misses = len(uncached_coords)
        cache_hits = total_grid_cells - cache_misses
        if cache_hits > 0 or cache_misses > 0:
            print(f"Road cache: {cache_hits} grid cells hit, {cache_misses} grid cells miss ({len(coords)} total coordinates)")
        
        return results
        
    except Exception as e:
        print(f"Error fetching nearest roads: {e}")
        import traceback
        traceback.print_exc()
        return [None] * len(coords)

async def fetch_road_data_db(south: float, west: float, north: float, east: float) -> List[Dict]:
    """
    Fetch road data from local PostGIS database for a bounding box.
    Returns a list of road records with geometry and attributes.
    Consistent with schema: roads table with columns: osm_id, code, fclass, name, ref, oneway, maxspeed, layer, bridge, tunnel, geom
    """
    try:
        engine = get_db_engine()
        async with engine.begin() as conn:
            # Query roads within bounding box using PostGIS
            # Using bounding box overlap operator (&&) for efficient spatial filtering
            # Schema: roads table with geometry column 'geom' as LINESTRING, SRID 4326
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
            
            # Convert to list of dicts - use column names from result keys
            # SQLAlchemy async results can be accessed by column name as attributes
            roads = []
            for row in rows:
                # Access columns by name (schema: osm_id, code, fclass, name, ref, oneway, maxspeed, layer, bridge, tunnel, geometry)
                # Try attribute access first, then fall back to index if needed
                try:
                    # SQLAlchemy Row objects support attribute access
                    osm_id = row.osm_id if hasattr(row, 'osm_id') else row[0]
                    fclass = row.fclass if hasattr(row, 'fclass') else row[2]
                    name = row.name if hasattr(row, 'name') else row[3]
                    ref = row.ref if hasattr(row, 'ref') else row[4]
                    oneway = row.oneway if hasattr(row, 'oneway') else row[5]
                    maxspeed = row.maxspeed if hasattr(row, 'maxspeed') else row[6]
                    bridge = row.bridge if hasattr(row, 'bridge') else row[8]
                    tunnel = row.tunnel if hasattr(row, 'tunnel') else row[9]
                    geom_data = row.geometry if hasattr(row, 'geometry') else row[10]
                except (IndexError, AttributeError):
                    # Fallback: try to convert row to dict
                    try:
                        row_dict = dict(row._mapping) if hasattr(row, '_mapping') else {}
                        osm_id = row_dict.get('osm_id')
                        fclass = row_dict.get('fclass')
                        name = row_dict.get('name')
                        ref = row_dict.get('ref')
                        oneway = row_dict.get('oneway')
                        maxspeed = row_dict.get('maxspeed')
                        bridge = row_dict.get('bridge')
                        tunnel = row_dict.get('tunnel')
                        geom_data = row_dict.get('geometry')
                    except:
                        # Last resort: skip this row
                        continue
                
                # Parse GeoJSON geometry to extract coordinates
                # GeoJSON format is [lon, lat], we need [lat, lon] for our distance calculations
                coords = []
                if geom_data and isinstance(geom_data, dict):
                    if geom_data.get('type') == 'LineString':
                        # GeoJSON: [lon, lat] -> convert to [lat, lon]
                        coords = [[coord[1], coord[0]] for coord in geom_data.get('coordinates', [])]
                    elif geom_data.get('type') == 'MultiLineString':
                        for linestring in geom_data.get('coordinates', []):
                            # GeoJSON: [lon, lat] -> convert to [lat, lon]
                            coords.extend([[coord[1], coord[0]] for coord in linestring])
                
                # Build road dict using schema column names
                road = {
                    'osm_id': osm_id,
                    'fclass': fclass,
                    'name': name,
                    'ref': ref,
                    'oneway': oneway,
                    'maxspeed': maxspeed,
                    'bridge': bridge,
                    'tunnel': tunnel,
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
    Returns format matching frontend RouteCondition.road interface:
    { surface: string, road_type: string, condition: string, name: string }
    
    Uses schema columns: fclass (road classification), name, ref (road reference)
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
        # Geometry is stored as [lat, lon] pairs after conversion from GeoJSON
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
    
    # Extract road information from database columns (schema: fclass, name, ref)
    # fclass is the road classification from OSM (motorway, primary, secondary, etc.)
    road_type = nearest_road.get("fclass", "unknown")
    name = nearest_road.get("name") or nearest_road.get("ref") or "Unnamed Road"
    
    # Determine condition based on road class (fclass from schema)
    # Common fclass values: motorway, primary, secondary, tertiary, residential, 
    #                       track, path, footway, cycleway, etc.
    condition = "good"
    if road_type in ["track", "path", "footway", "cycleway"]:
        condition = "poor"
    elif road_type in ["motorway", "primary", "secondary", "tertiary", "residential"]:
        condition = "good"
    else:
        # Default to good for most road types
        condition = "good"
    
    # Surface is not in the database schema, so we'll infer from road type
    # Could be enhanced with additional data sources in the future
    surface = "asphalt" if condition == "good" else "unknown"
    
    # Return format matching frontend RouteCondition.road interface
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
    
    # Note: We no longer cache all roads in bounding box
    # Instead, we use optimized PostGIS spatial queries to find nearest roads
    # for each sampled coordinate directly (much faster)
    
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
    
    # Collect all sampled coordinates for batch processing
    sampled_coords = [(coords[idx][0], coords[idx][1]) for idx in sampled_indices]
    
    # OPTIMIZATION: Use PostGIS spatial queries to find nearest roads for all sampled coordinates
    # This is much faster than loading all roads and computing distances in Python
    print(f"Fetching nearest roads for {len(sampled_coords)} sampled coordinates using PostGIS spatial queries...")
    nearest_roads = await fetch_nearest_roads_for_coords(sampled_coords, search_radius_km=0.1)
    
    # Group coordinates by 1km weather grid cells for efficient caching
    weather_grid_map = defaultdict(list)  # grid_key -> [(coord_idx, lat, lon), ...]
    for coord_idx, idx in enumerate(sampled_indices):
        lat, lon = coords[idx]
        weather_key = get_grid_key(lat, lon, grid_km=1.0)  # 1km grid for weather
        weather_grid_map[weather_key].append((coord_idx, idx, lat, lon))
    
    # Fetch weather for unique grid cells (parallel where possible)
    print(f"Fetching weather for {len(weather_grid_map)} unique 1km grid cells...")
    weather_tasks = []
    for weather_key, coord_list in weather_grid_map.items():
        # Check cache first
        cached_weather = await redis_client.get(f"weather:{weather_key}")
        if cached_weather:
            # Cache hit - use cached data
            weather_data = json.loads(cached_weather)
            for coord_idx, idx, lat, lon in coord_list:
                weather_cache[weather_key] = weather_data
        else:
            # Cache miss - need to fetch
            # Parse grid center coordinates from grid key (already at grid center)
            grid_lat, grid_lon = map(float, weather_key.split(','))
            weather_tasks.append((weather_key, grid_lat, grid_lon, coord_list))
    
    # Fetch uncached weather in parallel
    if weather_tasks:
        async def fetch_weather_for_grid(weather_key, grid_lat, grid_lon, coord_list):
            # Use grid center coordinates directly (no need to snap again)
            weather_data = await fetch_weather(grid_lat, grid_lon, use_grid=False)  # Already at grid center
            # Cache for 1 hour
            await redis_client.set(f"weather:{weather_key}", json.dumps(weather_data), ex=3600)
            return weather_key, weather_data
        
        weather_fetch_tasks = [
            fetch_weather_for_grid(weather_key, grid_lat, grid_lon, coord_list)
            for weather_key, grid_lat, grid_lon, coord_list in weather_tasks
        ]
        weather_results = await asyncio.gather(*weather_fetch_tasks, return_exceptions=True)
        
        # Process weather results
        for result in weather_results:
            if isinstance(result, Exception):
                print(f"Error fetching weather: {result}")
                continue
            weather_key, weather_data = result
            weather_cache[weather_key] = weather_data
    
    # Process each sampled coordinate
    for coord_idx, idx in enumerate(sampled_indices):
        lat, lon = coords[idx]
        
        # Get weather from cache (already fetched and cached by grid cell)
        weather_key = get_grid_key(lat, lon, grid_km=1.0)
        weather = weather_cache.get(weather_key, {"error": "Weather data not available"})
        
        # Get road info from PostGIS query result (much faster than Python iteration)
        nearest_road = nearest_roads[coord_idx] if coord_idx < len(nearest_roads) else None
        
        if nearest_road:
            # Extract road information from PostGIS query result
            road_type = nearest_road.get("fclass", "unknown")
            name = nearest_road.get("name") or nearest_road.get("ref") or "Unnamed Road"
            
            # Determine condition based on road class
            condition = "good"
            if road_type in ["track", "path", "footway", "cycleway"]:
                condition = "poor"
            elif road_type in ["motorway", "primary", "secondary", "tertiary", "residential"]:
                condition = "good"
            else:
                condition = "good"
            
            surface = "asphalt" if condition == "good" else "unknown"
            
            road_info = {
                "surface": surface,
                "road_type": road_type,
                "condition": condition,
                "name": name
            }
        else:
            # Fallback if no road found
            road_info = {
                "surface": "unknown",
                "road_type": "unknown",
                "condition": "unknown",
                "name": "Unknown Road"
            }
        
        # Store condition for this sampled coordinate
        # Format matches frontend RouteCondition interface:
        # { lat: number, lon: number, weather: {...}, road: {...} }
        sampled_conditions[idx] = {
            "lat": lat,
            "lon": lon,
            "weather": weather,  # Already formatted by fetch_weather()
            "road": road_info     # Already formatted above
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

# Backend Context Documentation

## Database Overview

### Current Database Setup
- **Database Name**: `accinet`
- **Database Owner**: `rjg` (system user)
- **PostgreSQL Version**: 16.10
- **PostGIS Version**: 3.4 (USE_GEOS=1 USE_PROJ=1 USE_STATS=1)
- **Total Road Records**: 1,144,447 rows
- **Database Size**: ~450 MB

### Database Connection
- **Connection Type**: Local PostgreSQL (USE_LOCAL_DB=true)
- **Host**: localhost
- **Port**: 5432
- **Authentication**: Peer authentication (no password required for local user `rjg`)
- **Connection String Format**: `postgresql+asyncpg://{user}@{host}:{port}/{db_name}`

### Database Schema

#### Table: `roads`
| Column | Type | Description |
|--------|------|-------------|
| osm_id | text | OpenStreetMap ID |
| code | integer | Road code |
| fclass | text | Road classification (motorway, primary, secondary, etc.) |
| name | text | Road name |
| ref | text | Road reference number |
| oneway | text | One-way indicator |
| maxspeed | integer | Maximum speed limit |
| layer | bigint | Layer information |
| bridge | text | Bridge indicator |
| tunnel | text | Tunnel indicator |
| geom | geometry(LineString,4326) | PostGIS geometry (SRID 4326) |

#### Indexes
- `idx_roads_geom` - GIST spatial index on `geom`
- `roads_geom_idx` - GIST spatial index on `geom` (duplicate)

## Route Data Fetching Implementation

### Current Implementation (`fetch_road_data_db`)

The function `fetch_road_data_db` in `app.py` (lines 286-356) fetches road data from the PostGIS database:

```python
async def fetch_road_data_db(south: float, west: float, north: float, east: float) -> List[Dict]:
```

**Query Used:**
```sql
SELECT 
    osm_id, code, fclass, name, ref, oneway, maxspeed, layer, bridge, tunnel,
    ST_AsGeoJSON(geom)::json as geometry
FROM roads
WHERE geom && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
LIMIT 1000
```

**Key Points:**
1. Uses PostGIS `ST_MakeEnvelope` to create a bounding box
2. Uses `&&` operator (bounding box overlap) for spatial filtering
3. Converts geometry to GeoJSON format
4. Limits results to 1000 roads per query
5. Converts GeoJSON coordinates from `[lon, lat]` to `[lat, lon]` format

### Coordinate System Handling

**Important**: The database stores coordinates in standard PostGIS format (lon, lat), but the application converts them:
- **Database/GeoJSON**: `[longitude, latitude]` (standard GeoJSON format)
- **Application**: `[latitude, longitude]` (converted in code at line 332)

This conversion happens in `fetch_road_data_db`:
```python
# GeoJSON: [lon, lat] -> convert to [lat, lon]
coords = [[coord[1], coord[0]] for coord in geom_data.get('coordinates', [])]
```

## API Endpoints

### Available Endpoints

1. **`GET /routes`**
   - **Purpose**: Get route alternatives between origin and destination
   - **Parameters**: `origin`, `destination`, `mode` (driving, walking, bicycling, transit, two_wheeler)
   - **Returns**: Array of `RouteDetails` objects, each containing:
     - `distance`: string (e.g., "5.2 mi")
     - `duration`: string (e.g., "12 mins")
     - `polyline`: string (encoded polyline)
     - `summary`: string (route summary)
     - `values`: number[] (optional, for gradient visualization)
     - `conditions`: RouteCondition[] (weather and road conditions for each coordinate)
   - **Note**: Routes include pre-computed condition data, so frontend can use this directly

2. **`GET /routes/segment`**
   - **Purpose**: Get road/weather info for a clicked coordinate on a route segment
   - **Parameters**: `lat`, `lon`, `polyline` (route's encoded polyline)
   - **Returns**: `{ road: {...}, weather: {...} }`
   - **Behavior**:
     - Finds nearest segment in route polyline
     - Returns condition data for that segment
     - Falls back to `/roads/info` if click is >100m from route
   - **Use Case**: On-demand lookup when clicking on plotted route segments

3. **`GET /roads/info`**
   - **Purpose**: Fallback endpoint for clicking on areas not on a route
   - **Parameters**: `lat`, `lon`
   - **Returns**: `{ road: {...}, weather: {...} }`
   - **Behavior**: Queries database for nearest road at coordinate
   - **Use Case**: Clicking on map areas outside of routes

4. **`GET /weather`**
   - **Purpose**: Get weather data for a coordinate
   - **Parameters**: `lat`, `lon`
   - **Returns**: Weather data with caching (1 hour TTL)

### Frontend Data Format

Routes return data matching these TypeScript interfaces:

```typescript
interface RouteCondition {
    lat: number;
    lon: number;
    weather: {
        current_weather?: {
            temperature?: number;
            weathercode?: number;
            windspeed?: number;
        };
        error?: string;
    };
    road: {
        surface: string;
        road_type: string;
        condition: string;
        name: string;
    };
}

interface RouteDetails {
    distance: string;
    duration: string;
    polyline: string;
    summary: string;
    values?: number[];
    conditions?: RouteCondition[];
}
```

## Route Processing Flow

1. **Route Request** (`/routes` endpoint):
   - Receives `origin`, `destination`, `mode` parameters
   - Calls Google Maps Directions API
   - Gets polyline-encoded route
   - **Returns routes with embedded condition data** (no separate API call needed)

2. **Route Conditions** (`get_route_conditions`):
   - Decodes polyline to get coordinate list
   - Calculates bounding box for entire route
   - Adds padding (~1km) to bounding box
   - Fetches road data from database for entire bounding box (single query per route)
   - Caches road data in Redis (24 hours)
   - Samples coordinates (every 8th point by default) for weather/road conditions
   - Matches sampled coordinates to nearest roads
   - Returns conditions array with data for all route coordinates

3. **Road Matching** (`extract_road_info`):
   - Finds nearest road to each coordinate using Haversine distance
   - Extracts road type, name, condition from database records
   - Uses schema columns: `fclass` (road classification), `name`, `ref` (road reference)

4. **On-Demand Segment Lookup** (`/routes/segment`):
   - Frontend clicks on route segment
   - Finds nearest coordinate in route polyline
   - Returns condition data for that segment
   - More efficient than querying database since route conditions are already computed

## Potential Issues & Differences

### 1. Database Connection Authentication
- **Current**: Uses peer authentication (system user `rjg`)
- **Potential Issue**: If running from different user context, connection may fail
- **Solution**: Either use password authentication or ensure correct user context
- **Note**: `asyncpg` (used by SQLAlchemy async) doesn't support Unix sockets, so it uses TCP/IP connections which may require different authentication setup

### 2. Query Performance
- **Current**: Uses bounding box overlap (`&&`) which is fast with GIST index
- **Query Performance**: Verified - ~10ms execution time for typical bounding box queries
- **Limit**: 1000 roads per query (may miss some roads in dense areas)
- **Note**: Two spatial indexes exist (duplicate) - could remove one
- **Important**: The comment in code says "ST_Intersects" but actually uses `&&` operator (which is correct and faster)

### 3. Coordinate System Consistency
- **Database**: Stores as `geometry(LineString,4326)` - standard WGS84
- **Query**: Uses `ST_MakeEnvelope` with SRID 4326 (correct)
- **Application**: Converts to `[lat, lon]` for distance calculations
- **Potential Issue**: If coordinate order is inconsistent elsewhere, could cause issues
- **Verified**: Database returns GeoJSON in correct `[lon, lat]` format

### 4. Async Connection Pool
- **Current**: Uses SQLAlchemy async engine with connection pooling
- **Pool Size**: 5 connections, max overflow 10
- **Connection Method**: TCP/IP (asyncpg limitation - no Unix socket support)
- **Potential Issue**: If database connection fails silently, errors may not be caught properly
- **Authentication**: May need `pg_hba.conf` configured for TCP/IP trust authentication

### 5. Error Handling
- **Current**: Returns empty list `[]` on database errors
- **Potential Issue**: Silent failures may make debugging difficult
- **Logging**: Errors are printed but not logged to file
- **Impact**: If database query fails, route conditions will be empty but route will still be returned

### 6. Query Parameter Binding
- **Current**: Uses named parameters (`:west`, `:south`, `:east`, `:north`)
- **Verified**: Query syntax is correct and works in direct SQL tests
- **Potential Issue**: If asyncpg parameter binding differs, could cause issues

## Testing the Database Connection

### Direct SQL Test (Verified Working)
```bash
# Test query
psql -d accinet -c "SELECT COUNT(*) FROM roads WHERE geom && ST_MakeEnvelope(-97.1, 32.9, -97.0, 33.0, 4326);"
# Result: 3113 roads found

# Test geometry extraction
psql -d accinet -c "SELECT ST_AsGeoJSON(geom)::json FROM roads LIMIT 1;"
# Result: Valid GeoJSON returned
```

### Python Connection Test
The `inspect_schema.py` script can be used to verify the database connection:
```bash
python3 inspect_schema.py
```

## Environment Configuration

Required `.env` variables:
```
USE_LOCAL_DB=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accinet
DB_USER=postgres  # or system user (rjg) for peer auth
DB_PASS=          # empty for peer authentication
```

## Differences from Other Implementations

### Key Architectural Differences:
1. **Route-Based Data Loading**: Only loads road data for route segments, not entire viewport
2. **Embedded Condition Data**: Routes include condition data in response (no separate API calls needed)
3. **On-Demand Segment Lookup**: `/routes/segment` endpoint for clicking on route segments
4. **Query Structure**: Uses `&&` (bounding box overlap) instead of `ST_Intersects` for performance
5. **Coordinate Order**: Converts GeoJSON `[lon, lat]` to application `[lat, lon]` format
6. **Connection Method**: Uses async SQLAlchemy with asyncpg (no Unix socket support)
7. **Error Handling**: Returns empty lists on errors (graceful degradation)
8. **Caching Strategy**: 
   - Route bounding box data: 24 hours
   - Weather data: 1 hour (grid-based)
   - Redis-based caching for both

### Removed Features:
- **`/roads/bbox` endpoint**: No longer needed since we don't load all roads in viewport
- **Bounding box road loading**: Replaced with route-specific road queries

## Implementation Details

### Road Data Fetching Strategy

**Current Approach**: Route-based, not bounding box-based
- Routes already include condition data in the response
- No need to load all roads in viewport bounding box
- Road information is fetched only for route segments
- Database queries are limited to route bounding boxes (more efficient)

**Benefits**:
- Reduced database load (only query roads along routes)
- Faster response times (conditions pre-computed with route)
- Lower memory usage (no need to load all visible roads)
- Better user experience (data available immediately in route response)

### Weather Data Format

Weather data is formatted to match frontend expectations:
- **Format**: `{ current_weather?: { temperature?, weathercode?, windspeed? }, error?: string }`
- **Temperature**: Fahrenheit (from Open-Meteo API)
- **Caching**: 1 hour TTL in Redis (grid-based, ~1km² cells)

### Road Data Format

Road data is formatted to match frontend expectations:
- **Format**: `{ surface: string, road_type: string, condition: string, name: string }`
- **Source**: Database `fclass` column (road classification)
- **Condition Logic**: 
  - "good" for motorway, primary, secondary, tertiary, residential
  - "poor" for track, path, footway, cycleway
- **Surface**: Inferred from condition (asphalt for good, unknown for poor)

## Recommendations

1. **Remove Duplicate Index**: Drop one of the two GIST indexes on `geom`
2. **Increase Query Limit**: Consider increasing from 1000 if routes span large areas
3. **Add Logging**: Implement proper logging instead of print statements
4. **Error Handling**: Consider raising exceptions for critical database errors
5. **Connection Testing**: Add health check endpoint to test database connectivity
6. **Coordinate Validation**: Add validation to ensure coordinate order consistency
7. **Route Caching**: Consider caching route condition data in Redis to avoid recomputation

## Schema Initialization

### Ensuring Consistent Schema Across Machines

To ensure the database schema is consistent on new machines, use one of these methods:

#### Method 1: SQL Script (Recommended for Quick Setup)
```bash
psql -d accinet -f init_schema.sql
```

#### Method 2: Python Script (Recommended for Automated Setup)
```bash
python3 init_schema.py
```

The initialization scripts will:
1. Enable PostGIS extension
2. Create the `roads` table with exact column definitions
3. Set geometry type to `LINESTRING` with SRID 4326
4. Create a single spatial index (removes duplicates)
5. Add helpful comments to the schema

### Schema Definition

The exact schema is defined as:
```sql
CREATE TABLE roads (
    osm_id   TEXT,
    code     INTEGER,
    fclass   TEXT,
    name     TEXT,
    ref      TEXT,
    oneway   TEXT,
    maxspeed INTEGER,
    layer    BIGINT,
    bridge   TEXT,
    tunnel   TEXT,
    geom     GEOMETRY(LINESTRING, 4326)
);

CREATE INDEX idx_roads_geom ON roads USING GIST (geom);
```

**Important Notes:**
- All columns are nullable (no NOT NULL constraints)
- Geometry is explicitly `LINESTRING` (not MultiLineString)
- SRID is 4326 (WGS84)
- Only one spatial index should exist (`idx_roads_geom`)

### Loading Data

After initializing the schema, load data using:
```bash
python3 load.py
```

The `load.py` script has been updated to:
- Check for existing table and create with consistent schema if missing
- Use `append` mode (or `replace` if you want to overwrite)
- Create only one spatial index to avoid duplicates

## API Endpoint Summary

| Endpoint | Method | Purpose | Parameters | Returns |
|----------|--------|---------|------------|---------|
| `/routes` | GET | Get route alternatives | `origin`, `destination`, `mode` | `RouteDetails[]` |
| `/routes/segment` | GET | Get segment info on route | `lat`, `lon`, `polyline` | `{ road, weather }` |
| `/roads/info` | GET | Get road info (fallback) | `lat`, `lon` | `{ road, weather }` |
| `/weather` | GET | Get weather data | `lat`, `lon` | Weather object |

## Files Reference

- **Main Application**: `app.py` - FastAPI application with route endpoints
  - Route endpoints: `/routes`, `/routes/segment`
  - Road endpoints: `/roads/info` (fallback for non-route areas)
  - Weather endpoint: `/weather`
- **Database Loader**: `load.py` - Script to load shapefiles into PostGIS (updated for schema consistency)
- **Schema Inspector**: `inspect_schema.py` - Script to inspect database schema
- **Schema Initialization**: `init_schema.py` - Python script for consistent schema creation
- **Schema SQL**: `init_schema.sql` - SQL script for consistent schema creation
- **Setup Guide**: `SETUP_NEW_MACHINE.md` - Complete guide for setting up on new machines
- **Setup Script**: `setup_local_postgres.sh` - Database setup automation
- **Schema Documentation**: `schema.md` - Database schema documentation

## Quick Start for New Machines

See `SETUP_NEW_MACHINE.md` for complete setup instructions. Quick version:

1. Create database: `sudo -u postgres createdb accinet`
2. Enable PostGIS: `sudo -u postgres psql -d accinet -c "CREATE EXTENSION postgis;"`
3. Initialize schema: `python3 init_schema.py`
4. Load data: `python3 load.py`
5. Verify: `python3 inspect_schema.py`


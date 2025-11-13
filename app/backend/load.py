import os
import geopandas as gpd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# -------------------------------
# 1) Load environment variables
# -------------------------------
load_dotenv()

# Determine if using local Postgres or Supabase
USE_LOCAL = os.getenv("USE_LOCAL_DB", "true").lower() == "true"

if USE_LOCAL:
    # Local Postgres configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "")  # Empty default for peer authentication
    USE_SSL = False
    DB_TYPE = "Local Postgres"
    
    # With peer authentication, PostgreSQL uses the system username
    # If no password and DB_USER is "postgres" but system user is different,
    # we'll need to use the system username or fall back to TCP/IP
    import getpass
    system_user = getpass.getuser()
    if not DB_PASS and DB_USER == "postgres" and system_user != "postgres":
        # Peer auth will use system user, so we need to either:
        # 1. Create a role for system_user, or
        # 2. Use TCP/IP with password
        # For now, warn and suggest creating the role
        print(f"⚠️  Note: With peer authentication, PostgreSQL will use system user '{system_user}'")
        print(f"   If you want to use user '{DB_USER}', either:")
        print(f"   - Create role: sudo -u postgres createuser -s {system_user}")
        print(f"   - Or set DB_PASS in .env to use password authentication")
        # Try using system user for peer auth
        DB_USER = system_user
else:
    # Supabase configuration
    DB_HOST = os.getenv("SUPABASE_DB_HOST", "db.supabase.co")
    DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")
    DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
    DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
    DB_PASS = os.getenv("SUPABASE_DB_PASS")
    USE_SSL = True
    DB_TYPE = "Supabase"
    
    if not DB_PASS:
        raise ValueError("Missing SUPABASE_DB_PASS in .env when using Supabase")

# -------------------------------
# 2) Connect to your PostGIS DB
# -------------------------------
# For local connections without password, use Unix socket (peer authentication)
# For connections with password or remote, use TCP/IP
if USE_LOCAL and not DB_PASS and DB_HOST in ["localhost", "127.0.0.1"]:
    # Use Unix socket for peer authentication (no password needed)
    # Try common PostgreSQL socket directories
    socket_dirs = [
        "/var/run/postgresql",  # Most common on modern Linux
        "/tmp",                  # Alternative location
        f"/var/lib/postgresql/{DB_PORT}",  # Some installations
    ]
    socket_dir = None
    for sd in socket_dirs:
        if os.path.exists(sd):
            socket_dir = sd
            break
    
    DB_URI = f"postgresql+psycopg2://{DB_USER}/{DB_NAME}"
    if socket_dir:
        print(f"🔌 Connecting to {DB_TYPE} via Unix socket at {socket_dir} (peer authentication)...")
        connect_args = {"host": socket_dir}
    else:
        print(f"🔌 Connecting to {DB_TYPE} via Unix socket (peer authentication, default location)...")
        # Omit host to use psycopg2 default socket location
        connect_args = {}
elif DB_PASS:
    # TCP/IP connection with password
    DB_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASS}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    print(f"🔌 Connecting to {DB_TYPE} at {DB_HOST}:{DB_PORT}...")
    connect_args = {"sslmode": "require"} if USE_SSL else {}
else:
    # TCP/IP connection without password (may fail if auth required)
    DB_URI = (
        f"postgresql+psycopg2://{DB_USER}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    print(f"🔌 Connecting to {DB_TYPE} at {DB_HOST}:{DB_PORT} (no password)...")
    connect_args = {"sslmode": "require"} if USE_SSL else {}

engine = create_engine(DB_URI, connect_args=connect_args)

# Test connection before proceeding
try:
    with engine.connect() as conn:
        # Check if PostGIS is installed
        try:
            postgis_version = conn.execute(text("SELECT PostGIS_version();")).scalar()
            print(f"✅ Database connection successful!")
            print(f"   PostGIS version: {postgis_version}")
        except Exception:
            # PostGIS might not be installed, but connection works
            result = conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Database connection successful!")
            print(f"   PostgreSQL version: {version[:50]}...")
            print(f"   ⚠️  WARNING: PostGIS extension not found. Install it with:")
            print(f"      CREATE EXTENSION postgis;")
except Exception as e:
    error_str = str(e)
    print(f"❌ Failed to connect to database:")
    print(f"   Error: {error_str}")
    if USE_LOCAL:
        print(f"\n💡 Tips for local Postgres:")
        if "role" in error_str.lower() and "does not exist" in error_str.lower():
            import getpass
            system_user = getpass.getuser()
            print(f"   ⚠️  PostgreSQL role '{system_user}' doesn't exist.")
            print(f"   Create it with:")
            print(f"      sudo -u postgres createuser -s {system_user}")
            print(f"   Or use password authentication by setting DB_PASS in .env")
        print(f"   - Ensure PostgreSQL is running: sudo systemctl status postgresql")
        print(f"   - Install PostGIS: sudo apt-get install postgresql-postgis")
        print(f"   - Create database: createdb -U postgres your_db_name")
        print(f"   - Enable PostGIS: psql -U postgres -d your_db_name -c 'CREATE EXTENSION postgis;'")
    else:
        print(f"\n💡 Tips for Supabase:")
        print(f"   - Check SUPABASE_DB_HOST in .env (format: db.<project-ref>.supabase.co)")
        print(f"   - Verify SUPABASE_DB_PASS is correct")
        print(f"   - Ensure your network can reach Supabase")
    raise

# -------------------------------
# 3) Load shapefile with GeoPandas
# -------------------------------
shapefile_path = "/home/rjg/texas_roads/gis_osm_roads_free_1.shp"
gdf = gpd.read_file(shapefile_path)  # geometry column is usually named 'geometry'
print(f"✅ Loaded shapefile with {len(gdf)} rows and {len(gdf.columns)} columns")
print(f"📋 Columns: {list(gdf.columns)}")
print(f"📍 Geometry column name: {gdf.geometry.name}")

# Show a few rows locally before upload
print("\n🔎 Local preview (first 5 rows):")
print(gdf.head())

# -------------------------------
# 3.1) (Optional) keep only key columns
# -------------------------------
# Adjust this list to your needs; comment out to keep everything.
'''
columns_to_keep = ["osm_id", "name", "fclass", "oneway", "bridge", "tunnel", gdf.geometry.name]
existing_columns = [c for c in columns_to_keep if c in gdf.columns]
if existing_columns:
    gdf = gdf[existing_columns]
'''
# -------------------------------
# 3.2) (Optional) filter for drivable roads
# -------------------------------
if "fclass" in gdf.columns:
    gdf = gdf[gdf["fclass"].isin(
        ["motorway", "primary", "secondary", "tertiary", "residential"]
    )]
    print(f"🚗 After filtering, {len(gdf)} rows remain")
else:
    print("⚠️  No 'fclass' column found, skipping filter")

# Ensure we still have a valid GeoDataFrame with geometry
if not isinstance(gdf, gpd.GeoDataFrame):
    raise ValueError("DataFrame lost geometry column during processing")
if gdf.geometry.isna().all():
    raise ValueError("All geometry values are null")

# -------------------------------
# 3.3) Ensure geometry column is named 'geom'
# -------------------------------
# This keeps geometry semantics intact AND sets the name used in PostGIS.
if gdf.geometry.name != "geom":
    gdf = gdf.rename_geometry("geom")
    print(f"✅ Renamed geometry column to 'geom'")
else:
    print(f"✅ Geometry column already named 'geom'")

# -------------------------------
# 3.4) Estimate data size before upload
# -------------------------------
# Rough estimation: each row with geometry typically takes 200-500 bytes
# This is a conservative estimate
estimated_size_mb = (len(gdf) * 400) / (1024 * 1024)  # 400 bytes per row average
print(f"\n📊 Data size estimation:")
print(f"   Rows: {len(gdf):,}")
print(f"   Estimated size: ~{estimated_size_mb:.1f} MB")
if not USE_LOCAL and estimated_size_mb > 500:
    print(f"   Supabase free tier limit: 500 MB")
    print(f"\n⚠️  WARNING: Estimated size ({estimated_size_mb:.1f} MB) exceeds free tier limit (500 MB)")
    print(f"   Consider:")
    print(f"   - Using local Postgres (set USE_LOCAL_DB=true in .env)")
    print(f"   - Filtering to a smaller geographic area")
    print(f"   - Removing unnecessary columns (uncomment section 3.1)")
    print(f"   - Simplifying geometries (reduce vertex count)")
    print(f"   - Using Supabase Pro tier ($25/month for 8 GB)")
    response = input("\n   Continue anyway? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("❌ Upload cancelled.")
        exit(0)
else:
    print(f"   ✅ Ready to upload")

# -------------------------------
# 4) Upload to PostGIS (chunked)
# -------------------------------
TABLE_NAME = "roads"
gdf.to_postgis(
    name=TABLE_NAME,
    con=engine,
    if_exists="replace",      # or 'append'
    index=False,
    chunksize=50000           # tune if needed
)
print(f"✅ Uploaded {len(gdf)} records to table '{TABLE_NAME}' in {DB_TYPE}.")

# -------------------------------
# 5) Verify upload + sample rows
# -------------------------------
with engine.begin() as conn:
    # Count rows
    count = conn.execute(text(f"SELECT COUNT(*) FROM {TABLE_NAME};")).scalar()
    print(f"🧮 Verified: {count} rows now in '{TABLE_NAME}'.")

    # Check geometry type distribution
    geom_types = conn.execute(text(
        f"SELECT ST_GeometryType(geom), COUNT(*) FROM {TABLE_NAME} GROUP BY 1;"
    )).fetchall()
    print("📐 Geometry types:")
    for gt, c in geom_types:
        print(f"  - {gt}: {c}")

    # Create spatial index (speeds up spatial queries)
    conn.execute(text(f"CREATE INDEX IF NOT EXISTS {TABLE_NAME}_geom_idx ON {TABLE_NAME} USING GIST (geom);"))

    # Grab a few sample rows back from DB
    sample = conn.execute(text(
        f"SELECT osm_id, name, fclass FROM {TABLE_NAME} LIMIT 5;"
    )).fetchall()

print("\n🔎 DB sample (first 5 rows):")
for row in sample:
    print(row)

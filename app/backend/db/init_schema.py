#!/usr/bin/env python3
"""
Schema initialization script for AcciNet database
Ensures consistent schema creation across all machines
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import getpass

# Load environment variables
load_dotenv()

# Determine if using local Postgres or Supabase
USE_LOCAL = os.getenv("USE_LOCAL_DB", "true").lower() == "true"

if USE_LOCAL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "accinet")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "")
    USE_SSL = False
    DB_TYPE = "Local Postgres"
    
    # Handle peer authentication
    system_user = getpass.getuser()
    if not DB_PASS and DB_USER == "postgres" and system_user != "postgres":
        DB_USER = system_user
else:
    DB_HOST = os.getenv("SUPABASE_DB_HOST", "db.supabase.co")
    DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")
    DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
    DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
    DB_PASS = os.getenv("SUPABASE_DB_PASS", "")
    USE_SSL = True
    DB_TYPE = "Supabase"
    
    if not DB_PASS:
        raise ValueError("Missing SUPABASE_DB_PASS in .env when using Supabase")

# Build connection string
if USE_LOCAL and not DB_PASS and DB_HOST in ["localhost", "127.0.0.1"]:
    socket_dirs = ["/var/run/postgresql", "/tmp", f"/var/lib/postgresql/{DB_PORT}"]
    socket_dir = None
    for sd in socket_dirs:
        if os.path.exists(sd):
            socket_dir = sd
            break
    
    DB_URI = f"postgresql+psycopg2://{DB_USER}/{DB_NAME}"
    if socket_dir:
        connect_args = {"host": socket_dir}
    else:
        connect_args = {}
elif DB_PASS:
    DB_URI = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    connect_args = {"sslmode": "require"} if USE_SSL else {}
else:
    DB_URI = f"postgresql+psycopg2://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    connect_args = {"sslmode": "require"} if USE_SSL else {}

print(f"🔌 Connecting to {DB_TYPE}...")
engine = create_engine(DB_URI, connect_args=connect_args)

try:
    with engine.connect() as conn:
        # Check PostGIS
        try:
            postgis_version = conn.execute(text("SELECT PostGIS_version();")).scalar()
            print(f"✅ PostGIS version: {postgis_version}")
        except Exception:
            print("⚠️  PostGIS not found. Creating extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
            postgis_version = conn.execute(text("SELECT PostGIS_version();")).scalar()
            print(f"✅ PostGIS installed: {postgis_version}")
        
        # Check if table exists
        table_exists = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roads'
            );
        """)).scalar()
        
        if table_exists:
            print("⚠️  Table 'roads' already exists.")
            response = input("Do you want to recreate it? This will DELETE all data! (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("❌ Aborted. Keeping existing table.")
                sys.exit(0)
            print("🗑️  Dropping existing table...")
            conn.execute(text("DROP TABLE IF EXISTS roads CASCADE;"))
            conn.commit()
        
        # Create table with exact schema
        print("📋 Creating roads table with consistent schema...")
        conn.execute(text("""
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
        """))
        conn.commit()
        print("✅ Table created successfully")
        
        # Drop existing indexes to avoid duplicates
        print("🔍 Cleaning up existing indexes...")
        conn.execute(text("DROP INDEX IF EXISTS idx_roads_geom;"))
        conn.execute(text("DROP INDEX IF EXISTS roads_geom_idx;"))
        conn.commit()
        
        # Create spatial index
        print("🗺️  Creating spatial index...")
        conn.execute(text("CREATE INDEX idx_roads_geom ON roads USING GIST (geom);"))
        conn.commit()
        print("✅ Spatial index created")
        
        # Add comments
        print("📝 Adding table comments...")
        conn.execute(text("COMMENT ON TABLE roads IS 'OpenStreetMap road data with PostGIS geometry';"))
        conn.execute(text("COMMENT ON COLUMN roads.osm_id IS 'OpenStreetMap feature ID';"))
        conn.execute(text("COMMENT ON COLUMN roads.fclass IS 'Road classification (motorway, primary, secondary, tertiary, residential, etc.)';"))
        conn.execute(text("COMMENT ON COLUMN roads.geom IS 'PostGIS LineString geometry in WGS84 (SRID 4326)';"))
        conn.commit()
        
        # Verify schema
        print("\n🔍 Verifying schema...")
        columns = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'roads'
            ORDER BY ordinal_position;
        """)).fetchall()
        
        print("\n📊 Table Schema:")
        for col_name, col_type, nullable in columns:
            null_str = "NULL" if nullable == "YES" else "NOT NULL"
            print(f"   - {col_name:<15} {col_type:<30} {null_str}")
        
        # Check geometry column
        geom_info = conn.execute(text("""
            SELECT type, srid, coord_dimension
            FROM geometry_columns
            WHERE f_table_name = 'roads' AND f_geometry_column = 'geom';
        """)).fetchone()
        
        if geom_info:
            print(f"\n🗺️  Geometry Column:")
            print(f"   - Type: {geom_info[0]}")
            print(f"   - SRID: {geom_info[1]}")
            print(f"   - Dimensions: {geom_info[2]}D")
        
        # Check indexes
        indexes = conn.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'roads';
        """)).fetchall()
        
        print(f"\n🔍 Indexes ({len(indexes)}):")
        for idx_name, idx_def in indexes:
            print(f"   - {idx_name}")
            if 'gist' in idx_def.lower():
                print(f"     (GIST spatial index)")
        
        print("\n✅ Schema initialization complete!")
        print("\n📋 Next steps:")
        print("   1. Load your road data using load.py")
        print("   2. Verify data with: python3 inspect_schema.py")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


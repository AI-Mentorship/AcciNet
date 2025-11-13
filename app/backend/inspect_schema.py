#!/usr/bin/env python3
"""
Script to inspect PostGIS database schema
Shows tables, columns, indexes, and spatial information
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv
import getpass

# Load environment variables
load_dotenv()

# Determine if using local Postgres or Supabase
USE_LOCAL = os.getenv("USE_LOCAL_DB", "true").lower() == "true"

if USE_LOCAL:
    # Local Postgres configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "")
    USE_SSL = False
    DB_TYPE = "Local Postgres"
    
    # Handle peer authentication
    system_user = getpass.getuser()
    if not DB_PASS and DB_USER == "postgres" and system_user != "postgres":
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

# Build connection string
if USE_LOCAL and not DB_PASS and DB_HOST in ["localhost", "127.0.0.1"]:
    # Use Unix socket for peer authentication
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
        # Check PostGIS version
        try:
            postgis_version = conn.execute(text("SELECT PostGIS_version();")).scalar()
            print(f"✅ Connected! PostGIS version: {postgis_version}\n")
        except Exception:
            print("✅ Connected! (PostGIS not detected)\n")
        
        inspector = inspect(engine)
        
        # Get all tables
        tables = inspector.get_table_names()
        
        if not tables:
            print("📭 No tables found in the database.")
            sys.exit(0)
        
        print("=" * 80)
        print(f"📊 DATABASE SCHEMA: {DB_NAME}")
        print("=" * 80)
        print()
        
        # Get database size
        db_size = conn.execute(text(
            f"SELECT pg_size_pretty(pg_database_size('{DB_NAME}'));"
        )).scalar()
        print(f"💾 Database size: {db_size}")
        print()
        
        # Get PostGIS extensions
        extensions = conn.execute(text("""
            SELECT extname, extversion 
            FROM pg_extension 
            WHERE extname LIKE 'postgis%'
            ORDER BY extname;
        """)).fetchall()
        
        if extensions:
            print("🗺️  PostGIS Extensions:")
            for ext_name, ext_version in extensions:
                print(f"   - {ext_name}: {ext_version}")
            print()
        
        # Iterate through tables
        for table_name in sorted(tables):
            print("=" * 80)
            print(f"📋 TABLE: {table_name}")
            print("=" * 80)
            
            # Get table size
            table_size = conn.execute(text(f"""
                SELECT pg_size_pretty(pg_total_relation_size('{table_name}'));
            """)).scalar()
            print(f"💾 Size: {table_size}")
            
            # Get row count
            row_count = conn.execute(text(f"SELECT COUNT(*) FROM {table_name};")).scalar()
            print(f"📊 Rows: {row_count:,}")
            print()
            
            # Get columns
            columns = inspector.get_columns(table_name)
            print("📝 Columns:")
            for col in columns:
                col_type = str(col['type'])
                # Handle PostGIS geometry type that SQLAlchemy doesn't recognize
                if col_type == 'NoneType' or col_type == 'NULL':
                    # Check if it's a geometry column
                    is_geom = conn.execute(text(f"""
                        SELECT COUNT(*) 
                        FROM geometry_columns 
                        WHERE f_table_name = '{table_name}' 
                        AND f_geometry_column = '{col['name']}';
                    """)).scalar()
                    if is_geom > 0:
                        # Get actual geometry type from geometry_columns
                        geom_info = conn.execute(text(f"""
                            SELECT type, srid 
                            FROM geometry_columns 
                            WHERE f_table_name = '{table_name}' 
                            AND f_geometry_column = '{col['name']}';
                        """)).fetchone()
                        if geom_info:
                            col_type = f"GEOMETRY({geom_info[0]}, {geom_info[1]})"
                        else:
                            col_type = "GEOMETRY"
                    else:
                        col_type = "UNKNOWN"
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                default = f" DEFAULT {col['default']}" if col['default'] is not None else ""
                print(f"   - {col['name']:<30} {col_type:<30} {nullable}{default}")
            print()
            
            # Check for geometry columns (PostGIS)
            geom_columns = conn.execute(text(f"""
                SELECT 
                    f_geometry_column,
                    type,
                    coord_dimension,
                    srid
                FROM geometry_columns 
                WHERE f_table_name = '{table_name}';
            """)).fetchall()
            
            if geom_columns:
                print("🗺️  Geometry Information:")
                for geom_col, geom_type, coord_dim, srid in geom_columns:
                    print(f"   - Column: {geom_col}")
                    print(f"   - Type: {geom_type}")
                    print(f"   - Dimensions: {coord_dim}D")
                    print(f"   - SRID: {srid}")
                    
                    # Get actual geometry type from sample data
                    try:
                        actual_type = conn.execute(text(f"""
                            SELECT DISTINCT ST_GeometryType({geom_col}) 
                            FROM {table_name} 
                            WHERE {geom_col} IS NOT NULL 
                            LIMIT 5;
                        """)).fetchall()
                        if actual_type:
                            types = [t[0] for t in actual_type]
                            if len(types) == 1:
                                print(f"   - Actual Type: {types[0]}")
                            else:
                                print(f"   - Actual Types: {', '.join(types)}")
                    except Exception as e:
                        # If we can't get actual types, that's okay
                        pass
                    
                    if srid:
                        try:
                            srid_info = conn.execute(text(f"""
                                SELECT auth_name, auth_srid, srtext 
                                FROM spatial_ref_sys 
                                WHERE srid = {srid}
                                LIMIT 1;
                            """)).fetchone()
                            if srid_info:
                                print(f"   - CRS: {srid_info[0]}:{srid_info[1]} ({srid_info[2][:60]}...)")
                        except:
                            pass
                    print()
            
            # Get indexes
            indexes = inspector.get_indexes(table_name)
            if indexes:
                print("🔍 Indexes:")
                for idx in indexes:
                    idx_cols = ", ".join(idx['column_names'])
                    unique = "UNIQUE" if idx['unique'] else ""
                    idx_type = ""
                    # Check if it's a spatial index (GIST)
                    try:
                        idx_info = conn.execute(text(f"""
                            SELECT indexdef 
                            FROM pg_indexes 
                            WHERE tablename = '{table_name}' 
                            AND indexname = '{idx['name']}';
                        """)).scalar()
                        if idx_info and 'gist' in idx_info.lower():
                            idx_type = " (GIST spatial index)"
                    except:
                        pass
                    print(f"   - {idx['name']:<40} ON ({idx_cols}) {unique}{idx_type}")
                print()
            
            # Get foreign keys
            foreign_keys = inspector.get_foreign_keys(table_name)
            if foreign_keys:
                print("🔗 Foreign Keys:")
                for fk in foreign_keys:
                    local_cols = ", ".join(fk['constrained_columns'])
                    ref_table = fk['referred_table']
                    ref_cols = ", ".join(fk['referred_columns'])
                    print(f"   - ({local_cols}) -> {ref_table}({ref_cols})")
                print()
            
            # Get primary keys
            primary_keys = inspector.get_pk_constraint(table_name)
            if primary_keys['constrained_columns']:
                pk_cols = ", ".join(primary_keys['constrained_columns'])
                print(f"🔑 Primary Key: ({pk_cols})")
                print()
            
            print()
        
        # Summary of spatial tables
        spatial_tables = conn.execute(text("""
            SELECT f_table_name, f_geometry_column, type, srid
            FROM geometry_columns
            ORDER BY f_table_name;
        """)).fetchall()
        
        if spatial_tables:
            print("=" * 80)
            print("🗺️  SPATIAL TABLES SUMMARY")
            print("=" * 80)
            for table, geom_col, geom_type, srid in spatial_tables:
                row_count = conn.execute(text(f"SELECT COUNT(*) FROM {table};")).scalar()
                print(f"   {table}.{geom_col} - {geom_type} (SRID: {srid}) - {row_count:,} rows")
            print()
        
        # Get spatial reference systems count
        srid_count = conn.execute(text("SELECT COUNT(*) FROM spatial_ref_sys;")).scalar()
        print(f"🌍 Available Spatial Reference Systems: {srid_count}")
        print()
        
        print("=" * 80)
        print("✅ Schema inspection complete!")
        print("=" * 80)

except Exception as e:
    print(f"❌ Error: {str(e)}")
    sys.exit(1)


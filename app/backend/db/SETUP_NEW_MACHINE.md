# Setting Up AcciNet Backend on a New Machine

This guide ensures consistent database schema and setup across all machines.

## Prerequisites

1. PostgreSQL 12+ installed
2. PostGIS extension available
3. Python 3.8+ with virtual environment
4. Required Python packages (see `requirements.txt`)

## Step-by-Step Setup

### 1. Install PostgreSQL and PostGIS

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib postgresql-postgis

# Verify installation
psql --version
```

### 2. Create Database and Enable PostGIS

```bash
# Create database
sudo -u postgres createdb accinet

# Enable PostGIS extension
sudo -u postgres psql -d accinet -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Verify PostGIS
sudo -u postgres psql -d accinet -c "SELECT PostGIS_version();"
```

### 3. Configure Environment

Create a `.env` file in the backend directory:

```bash
# Database Configuration
USE_LOCAL_DB=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accinet
DB_USER=postgres  # or your system username for peer auth
DB_PASS=          # leave empty for peer authentication

# Google Maps API (required for routes)
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 4. Initialize Database Schema

**Option A: Using Python Script (Recommended)**
```bash
cd /path/to/AcciNet/app/backend
python3 init_schema.py
```

**Option B: Using SQL Script**
```bash
psql -d accinet -f init_schema.sql
```

This will create the `roads` table with the exact schema:
- All columns with correct data types
- Geometry column as `LINESTRING` with SRID 4326
- Single spatial index (`idx_roads_geom`)

### 5. Load Road Data

After schema initialization, load your road data:

```bash
# Update load.py with your shapefile path
# Then run:
python3 load.py
```

The `load.py` script will:
- Check if table exists (create if needed with consistent schema)
- Load shapefile data
- Create spatial index
- Verify data integrity

### 6. Verify Setup

Run the schema inspector to verify everything is correct:

```bash
python3 inspect_schema.py
```

You should see:
- ✅ PostGIS version
- ✅ Table `roads` with correct columns
- ✅ Geometry type: LINESTRING, SRID: 4326
- ✅ Spatial index: `idx_roads_geom`

### 7. Test Database Connection

Test the connection from Python:

```bash
python3 -c "
from app import get_db_engine
import asyncio

async def test():
    engine = get_db_engine()
    async with engine.begin() as conn:
        from sqlalchemy import text
        result = await conn.execute(text('SELECT COUNT(*) FROM roads'))
        print(f'Roads in database: {result.scalar()}')

asyncio.run(test())
"
```

## Schema Consistency Checklist

When setting up on a new machine, verify:

- [ ] PostGIS extension is enabled
- [ ] Table `roads` exists with exact column names and types
- [ ] Geometry column is `GEOMETRY(LINESTRING, 4326)` (not MultiLineString)
- [ ] Only ONE spatial index exists: `idx_roads_geom`
- [ ] All columns are nullable (no NOT NULL constraints)
- [ ] Data loads successfully

## Troubleshooting

### Issue: "Peer authentication failed"
**Solution**: Either:
1. Use your system username in `DB_USER` (for peer auth)
2. Set a password in `.env` and configure PostgreSQL for password auth
3. Run `configure_pg_trust.sh` to enable trust authentication

### Issue: "Table already exists"
**Solution**: The init script will ask if you want to recreate it. Use with caution as it deletes all data.

### Issue: "PostGIS extension not found"
**Solution**: Install PostGIS:
```bash
sudo apt-get install postgresql-postgis
sudo -u postgres psql -d accinet -c "CREATE EXTENSION postgis;"
```

### Issue: "Multiple spatial indexes"
**Solution**: Run the init script which will clean up duplicates:
```bash
python3 init_schema.py
```

## Differences from Other Machines

If you're migrating from another machine or comparing implementations:

1. **Check schema consistency**: Run `inspect_schema.py` on both machines
2. **Compare indexes**: Ensure only one spatial index exists
3. **Verify geometry type**: Should be `LINESTRING`, not `MultiLineString`
4. **Check SRID**: Must be 4326 (WGS84)
5. **Column order**: Should match exactly (use `\d roads` in psql)

## Quick Reference

```bash
# Initialize schema
python3 init_schema.py

# Load data
python3 load.py

# Inspect schema
python3 inspect_schema.py

# Test connection
psql -d accinet -c "SELECT COUNT(*) FROM roads;"
```

## Files Created

- `init_schema.sql` - SQL script for schema creation
- `init_schema.py` - Python script for schema creation (with verification)
- `context.md` - Detailed documentation of current implementation
- `SETUP_NEW_MACHINE.md` - This file


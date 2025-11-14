-- ============================================================================
-- AcciNet Database Schema Initialization Script
-- ============================================================================
-- This script ensures consistent schema creation across all machines
-- Run this script on a new machine before loading data
-- ============================================================================

-- Enable PostGIS extension (required for spatial data)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing table if it exists (use with caution in production!)
-- DROP TABLE IF EXISTS roads CASCADE;

-- Create roads table with exact schema specification
CREATE TABLE IF NOT EXISTS roads (
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

-- Create spatial index (GIST) for efficient spatial queries
-- Drop existing indexes first to avoid duplicates
DROP INDEX IF EXISTS idx_roads_geom;
DROP INDEX IF EXISTS roads_geom_idx;

-- Create single spatial index with consistent name
CREATE INDEX idx_roads_geom ON roads USING GIST (geom);

-- Add comment to table
COMMENT ON TABLE roads IS 'OpenStreetMap road data with PostGIS geometry';

-- Add comments to key columns
COMMENT ON COLUMN roads.osm_id IS 'OpenStreetMap feature ID';
COMMENT ON COLUMN roads.fclass IS 'Road classification (motorway, primary, secondary, tertiary, residential, etc.)';
COMMENT ON COLUMN roads.geom IS 'PostGIS LineString geometry in WGS84 (SRID 4326)';

-- Verify schema creation
DO $$
BEGIN
    RAISE NOTICE 'Schema initialization complete!';
    RAISE NOTICE 'Table: roads';
    RAISE NOTICE 'Geometry type: LINESTRING, SRID: 4326';
    RAISE NOTICE 'Spatial index: idx_roads_geom (GIST)';
END $$;


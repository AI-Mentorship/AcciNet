(venv) rjg@LITTLERGLT:~/coding/AcciNet/app/backend$ python3 inspect_schema.py
🔌 Connecting to Local Postgres...
✅ Connected! PostGIS version: 3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1

================================================================================
📊 DATABASE SCHEMA: accinet
================================================================================

💾 Database size: 450 MB

🗺️  PostGIS Extensions:
   - postgis: 3.4.2

================================================================================
📋 TABLE: roads
================================================================================
💾 Size: 435 MB
📊 Rows: 1,144,447

/home/rjg/coding/AcciNet/app/backend/inspect_schema.py:133: SAWarning: Did not recognize type 'geometry' of column 'geom'
  columns = inspector.get_columns(table_name)
📝 Columns:
   - osm_id                         TEXT                           NULL
   - code                           INTEGER                        NULL
   - fclass                         TEXT                           NULL
   - name                           TEXT                           NULL
   - ref                            TEXT                           NULL
   - oneway                         TEXT                           NULL
   - maxspeed                       INTEGER                        NULL
   - layer                          BIGINT                         NULL
   - bridge                         TEXT                           NULL
   - tunnel                         TEXT                           NULL
   - geom                           GEOMETRY(LINESTRING, 4326)     NULL

🗺️  Geometry Information:
   - Column: geom
   - Type: LINESTRING
   - Dimensions: 2D
   - SRID: 4326
   - Actual Type: ST_LineString
   - CRS: EPSG:4326 (GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,2...)

🔍 Indexes:
   - idx_roads_geom                           ON (geom)  (GIST spatial index)
   - roads_geom_idx                           ON (geom)  (GIST spatial index)


================================================================================
📋 TABLE: spatial_ref_sys
================================================================================
💾 Size: 7144 kB
📊 Rows: 8,500

📝 Columns:
   - srid                           INTEGER                        NOT NULL
   - auth_name                      VARCHAR(256)                   NULL
   - auth_srid                      INTEGER                        NULL
   - srtext                         VARCHAR(2048)                  NULL
   - proj4text                      VARCHAR(2048)                  NULL

🔑 Primary Key: (srid)


================================================================================
🗺️  SPATIAL TABLES SUMMARY
================================================================================
   roads.geom - LINESTRING (SRID: 4326) - 1,144,447 rows

🌍 Available Spatial Reference Systems: 8500

================================================================================
✅ Schema inspection complete!
================================================================================
(venv) rjg@LITTLERGLT:~/coding/AcciNet/app/backend$ python3 inspect_schema.py
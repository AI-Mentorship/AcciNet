import geopandas as gpd 
import json
import chardet 
import os

#ascii UTF-8 encoded
geo_files = '/home/rjg/coding/aim/accinet/app/frontend/accinet/public/geo-json/'
us_geo = geo_files +"us-state.json"
counties_geo = geo_files + "us-counties-utf8.json"

gdf_states = gpd.read_file(us_geo)
#print(gdf_states)

gdf_counties = gpd.read_file(counties_geo)
#print(gdf_texas)



col = 'STATE'
state_code = '48'
texas_mask = gdf_counties[col] == state_code
gdf_texas = gdf_counties[texas_mask]

texas_state_mask = gdf_states[col] == state_code
gdf_state_texas = gdf_states[texas_state_mask]
print(gdf_state_texas)

#print(gdf_texas)

#gdf_texas.to_file('texas-counties.json',driver='GeoJSON')
gdf_state_texas.to_file( geo_files+ 'texas-state.json',driver='GeoJSON')


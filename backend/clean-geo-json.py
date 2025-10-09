import geopandas as gpd 
import json

with open("/home/rjg/coding/aim/accinet/frontend/accinet/public/geo-json/us-state.json", 
          "r", encoding="utf-8", errors="replace") as f:
    data = json.load(f)

print(data)

'''
gdf_state = gpd.read_file("/home/rjg/coding/aim/accinet/frontend/accinet/public/geo-json/us-state.json")
gdf_county = gpd.read_file("/home/rjg/coding/aim/accinet/frontend/accinet/public/geo-json/us-counties.json")

texas_code = 48

texas_coord = gdf[gdf["NAME"]=="Texas"]
print(texas_coord)
'''
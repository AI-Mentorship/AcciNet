import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, box, Polygon
import numpy as np
import matplotlib.pyplot as plt

import datetime


crash_frame = pd.read_csv("encoded_data_binary_encoding.csv")

gdf = gpd.GeoDataFrame(
    crash_frame, 
    geometry=gpd.points_from_xy(crash_frame["Longitude"], crash_frame["Latitude"]), 
    crs="EPSG:4326"
)

# left upper bound - 33°15'08.7"N 97°21'46.3"W
# right lower bound - 32°22'36.5"N 96°07'37.0"W

#using our bounds, create the corners we'll use in our polygon
upperLeft = (-1 * (97 + 21/60 + 46.3/3600), 33 + 15/60 + 8.7/3600)
bottomRight = (-1 * (96 + 7/60 + 37/3600), 32 + 22/60 + 36.5/3600)

upperRight = (bottomRight[0], upperLeft[1])
bottomLeft = (upperLeft[0], bottomRight[1])

# create the polygon
dallasBounds = Polygon([upperLeft, upperRight, bottomRight, bottomLeft, upperLeft])

# create teh dataframe
dallasFrame = gpd.GeoDataFrame({"geometry": [dallasBounds]}, crs="EPSG:4326")

# cahnge coordinate system of both
dallasFrame = dallasFrame.to_crs(epsg=32614)
gdf = gdf.to_crs(epsg=32614)

cell_size = 500

minx, miny, maxx, maxy = dallasFrame.total_bounds

grids = []
index = 0
# create grids based on the bounds
for x in np.arange(minx, maxx, cell_size):
    for y in np.arange(miny, maxy, cell_size):
        grids.append(box(x, y, x+cell_size, y+cell_size))

# 2. Optional: intersect with Dallas boundary to crop
grid = gpd.GeoDataFrame({"geometry": grids}, crs=dallasFrame.crs)

grid = gpd.overlay(grid, dallasFrame, how="intersection")

# combine it based on which cells are matching
joined_data = gpd.sjoin(gdf, grid, how="left", predicate="intersects")

final_cells = []

# group by when they go to similar cells
for _, crashes in joined_data.groupby("index_right"):
    cellIndex = crashes.iloc[0]["index_right"]
    print(f'In cell {cellIndex} we have {len(crashes)} crashes!')
    crashes.drop(columns=["index_right", "Crash ID", "geometry"], inplace=True)

    crashes["crash_count_7d"] = 0
    crashes["crash_count_30d"] = 0
    crashes["label"] = 0

    crashes["Crash Date"] = pd.to_datetime(crashes["Crash Date"], format="%Y-%m-%d")
    crashes = crashes.sort_values("Crash Date", ascending=True).reset_index(drop=True)

    # now look through previous crashes, keep rolling window of rows there, and subtract by 1 to discount the current row
    crashes["crash_count_7d"] = crashes.rolling("7d", on="Crash Date")["Crash Date"].count() - 1
    crashes["crash_count_30d"] = crashes.rolling("30d", on="Crash Date")["Crash Date"].count() - 1

    # loop through each crash to add it to each timeslot
    for i, crash in crashes.iterrows():
        # rolling_7_count = 0
        # rolling_30_count = 0
        # # loop through previous crashes
        # for j in range(i - 1, -1, -1):
        #     prevCrashDate = crashes.iloc[j]["Crash Date"]
        #     daysPassed = (currentCrashDate - prevCrashDate).days
        #     # use this if sattement to add it
        #     if(daysPassed > 30):
        #         break
        #     # note that we don't use an else statement. This way if both are true, it'll be added to both
        #     if(daysPassed <= 7):
        #         rolling_7_count += 1
        #     if(daysPassed <= 30):
        #         rolling_30_count += 1
        # # now, add it to the count
        # crash["crash_c    ount_7d"] = rolling_7_count
        # crash["crash_count_30d"] = rolling_30_count

        
        # loop through each possible timeslot represneted by j, and put into the cells the value with the correct label based on if the time matches.
        for j in range(24):
            crashIndex = crash["Hour of Day"]
            crashToAppend = crash.copy()
            # check if the timeslot matches. If so, put crash with label of 1, otherwise keep it as the 0
            if(crashIndex == j):
                crashToAppend["label"] = 1
            final_cells.append(crashToAppend)

exportedDf = pd.DataFrame(final_cells)
exportedDf.drop('Crash Date', axis=1, inplace=True)
exportedDf.to_csv("preprocessed_data.csv", index=False)
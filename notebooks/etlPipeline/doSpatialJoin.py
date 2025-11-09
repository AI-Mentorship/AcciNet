import pandas as pd
import geopandas as gpd

def joinCSVs(crashPath, datasetPath, keptColumns):
    crashFile = pd.read_csv(crashPath, header= 0)

    print(crashFile.head())

    crashDf = gpd.GeoDataFrame(
        crashFile, 
        geometry=gpd.points_from_xy(crashFile["Longitude"], crashFile["Latitude"]), 
        crs="EPSG:4326"
    )

    widthDf = gpd.read_file(datasetPath)

    widthDf = widthDf[keptColumns]

    print(widthDf["FC_DESC"].unique())

    print(f"Prev CRS is: {widthDf.crs}")

    crashDf = crashDf.to_crs(epsg=3857)

    widthDf = widthDf.to_crs(epsg=3857)

    print(widthDf.head())

    # approximately 0.01 degree is a km, so with this it's a bit less than that
    joinedDf = gpd.sjoin_nearest(crashDf, widthDf, how= "left", max_distance=300)

    print(f"Num rows before join: {joinedDf.shape[0]}")

    joinedDf = joinedDf[joinedDf["index_right"].notna()]

    joinedDf.drop(columns=["index_right", "geometry"], inplace=True)

    print(f"Num rows after join: {joinedDf.shape[0]}")

    return joinedDf
import pandas as pd
import geopandas as gpd
from shapely import wkb, Point

'''
This does a spatial join between the two datasets based on geoemtry. Parameters are:
- crashPathOrDf: this is either the path to the crash dataset, or the dataframe of it, depending on if we needed to create it or not (which
addAADT is the only one that needs this)/
- datasetPathOrDf: this is either path to the joining dataset or its dataframe
- datasetIsParquet: controls whether or not the dataset we're joining is a parquet or not. If it's not, assume its a shp file
- needCreateDataset: we do this if we're passing in a path for our crashPath and datasetPath, otherwise we obviuosly already have
- the dataframes
- maxMeterDist: the maxx dist used for sjoin. If none, can join with a node of any range
- removeGeomery: controls if we want to remove certain columns like the geometry or index_right in this funiction, or save them for later
- earlyQuit: controls whether we just only get the dataframes without doing the join
'''
def joinCSVs(crashPathOrDf, datasetPathOrDf, datasetIsParquet, keptColumns, needCreateDataset, maxMeterDist, removeGeometry, onlyGetDf):
    if(needCreateDataset):
        crashFile = pd.read_parquet(crashPathOrDf)

        print(crashFile.head())

        crashDf = gpd.GeoDataFrame(
            crashFile, 
            geometry=gpd.points_from_xy(crashFile["Longitude"], crashFile["Latitude"]), 
            crs="EPSG:4326"
        )

        if(datasetIsParquet):
            appendSetDf = pd.read_parquet(datasetPathOrDf, columns=keptColumns)
            # if it has the geometry already (texas edges), gonna just use it directlyh. Otherwise if just latitude andl ongitude (texas nodes), can make geometry from that
            if "geometry" in appendSetDf.columns:
                appendSetDf["geometry"] = appendSetDf["geometry"].apply(wkb.loads)
                appendSetDf = gpd.GeoDataFrame(appendSetDf, 
                            geometry="geometry",
                            crs="EPSG:4326")
            else:
                appendSetDf = gpd.GeoDataFrame(appendSetDf, 
                            geometry=gpd.points_from_xy(appendSetDf["lon"], appendSetDf["lat"]),
                            crs="EPSG:4326")
        # otherwise it's a shape file, so can just read it easily like this
        else:
            appendSetDf = gpd.read_file(datasetPathOrDf,columns=keptColumns)
    else:
        crashDf = crashPathOrDf
        appendSetDf = datasetPathOrDf

    # print(appendSetDf["FC_DESC"].unique())

    print(f"Prev CRS is: {appendSetDf.crs}")

    crashDf = crashDf.to_crs(   )

    appendSetDf = appendSetDf.to_crs(epsg=3857)

    if(onlyGetDf):
        return (crashDf, appendSetDf)

    print(appendSetDf.head())

    # approximately 0.01 degree is a km, so with this it's a bit less than that
    joinedDf = gpd.sjoin_nearest(crashDf, appendSetDf, how= "left", max_distance=maxMeterDist, distance_col="dist_to_intersection")

    print(f"Num rows before join: {joinedDf.shape[0]}")

    joinedDf = joinedDf[joinedDf["index_right"].notna()]

    if(removeGeometry):
        joinedDf.drop(columns=["index_right", "geometry", "dist_to_intersection"], inplace=True)
    else:
        joinedDf["dataset_geometry"] = (
            appendSetDf.loc[joinedDf["index_right"]]
            .geometry
            .apply(lambda geom: [Point(x, y) for x, y in geom.coords])
        )

    print(f"Num rows after join: {joinedDf.shape[0]}")

    return joinedDf
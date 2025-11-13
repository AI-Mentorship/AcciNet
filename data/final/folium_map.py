import pandas as pd
import folium

df = pd.read_csv("/Users/user/Downloads/crash_data2022-2025.csv")
print(df.columns)

lat_col = "Latitude"   
lon_col = "Longitude"  


df = df[(df[lat_col] >= 26.0) & (df[lat_col] <= 36.5) &
        (df[lon_col] >= -106.5) & (df[lon_col] <= -93.5)]



mapObj = folium.Map(location=[31.9686, -99.9018], zoom_start=6, tiles="cartodb positron")


for _, row in df.iterrows():
    folium.CircleMarker(
        location=[row[lat_col], row[lon_col]],
        radius=3,
        color='red',
        fill=True,
        fill_opacity=0.5
    ).add_to(mapObj)

mapObj.save("/Users/user/AcciNet/data/final/map.html")
print("Map saved")

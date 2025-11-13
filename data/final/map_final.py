import pandas as pd
import folium


df = pd.read_csv("/Users/user/Downloads/crash_data2022-2025.csv")

df['Crash_Date'] = pd.to_datetime(df['Crash_Date'], errors='coerce')

df['Year'] = df['Crash_Date'].dt.year
df['Month'] = df['Crash_Date'].dt.month
df['Hour'] = df['Crash_Date'].dt.hour

df_filtered = df[(df['Latitude'] >= 26.0) & (df['Latitude'] <= 36.5) &
                 (df['Longitude'] >= -106.5) & (df['Longitude'] <= -93.5)]

mapObj = folium.Map(location=[31.9686, -99.9018], zoom_start=6, tiles="cartodb positron")

for _, row in df_filtered.iterrows():
    folium.CircleMarker(
        location=[row['Latitude'], row['Longitude']], 
        radius=3,  
        color='red',  
        fill=True,
        fill_opacity=0.5
    ).add_to(mapObj)

mapObj.save("/Users/user/AcciNet/data/final/texas_crash_map.html")
print("Map with crash locations across Texas saved")

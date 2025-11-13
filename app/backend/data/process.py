import pandas as pd

# Read only a small sample (first 500 rows is usually enough for type inference)
df = pd.read_csv("crash_data_2021-2025.csv", nrows=100)


# Show column names and inferred data types
print(df)

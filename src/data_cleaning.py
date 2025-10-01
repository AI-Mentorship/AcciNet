# Video: https://www.youtube.com/watch?v=GP-2634exqA
# Data Source: https://cris.dot.state.tx.us/public/Query/app/query-builder/disclaimer

import pandas as pd 
import numpy as np 
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.impute import KNNImputer
from sklearn.preprocessing import OneHotEncoder
import category_encoders as ce
import os
import glob
import calendar

path = 'data'
files = glob.glob(os.path.join(path, '*.csv'))
print(files)
all_dfs = []

for filename in files:
    cur_df = pd.read_csv(filename, index_col=None, header=0, skiprows=10)
    all_dfs.append(cur_df)

df = pd.concat(all_dfs)
print(df.shape) 

# fixing longitude/latitude
df = df[df['Longitude'] != 'No Data']    
df = df[df['Latitude'] != 'No Data']  
df['Latitude'] = pd.to_numeric(df['Latitude'])
df['Longitude'] = pd.to_numeric(df['Longitude'])

# get rid of OTHER (EXPLAIN IN NARRATIVE) and UNKNOWN
df = df[df['Light Condition'] != '99 - UNKNOWN']
df = df[df['Light Condition'] != '98 - OTHER (EXPLAIN IN NARRATIVE)']
df = df[df['Light Condition'] != '4 - DARK, UNKNOWN LIGHTING']
df = df[df['Weather Condition'] != '99 - UNKNOWN']
df = df[df['Weather Condition'] != '98 - OTHER (EXPLAIN IN NARRATIVE)']

# get rid of other roads rows
df = df[df['Road Class'] != 'OTHER ROADS']

# get rid of missing speed limit rows
df = df[df['Speed Limit'] != -1]

# get rid of surface type (no data for any row)
df = df.drop(columns=['Surface Type'])

# fixing adjusted average daily traffic amount and percentage of single unit truck average daily traffic
df = df[df['Adjusted Average Daily Traffic Amount'] != 'No Data']
df = df[df['Percentage of Single Unit Truck Average Daily Traffic'] != 'No Data']
df['Adjusted Average Daily Traffic Amount'] = pd.to_numeric(df['Adjusted Average Daily Traffic Amount'])
df['Percentage of Single Unit Truck Average Daily Traffic'] = pd.to_numeric(df['Percentage of Single Unit Truck Average Daily Traffic'])

# changing yes/no columns to boolean columns
mapping = {'Yes': True, 'No': False}
df['Rural Flag'] = df['Rural Flag'].map(mapping)
df['Construction Zone Flag'] = df['Construction Zone Flag'].map(mapping)

# changing hours to numbers
df['Hour of Day'] = df['Hour of Day'].str[:2]
df['Hour of Day'] = pd.to_numeric(df['Hour of Day'])

"""
# changing date to a number from 0-1
year = pd.to_numeric(df['Crash Date'].str[:4])
crash_date = pd.to_datetime(df['Crash Date'])
start_of_year = pd.to_datetime(pd.to_datetime(f'{year.astype(str)}-01-01'))
print('start of year')
print(start_of_year)
divisor = year.apply(lambda x: 366 if (x % 4 == 0 and x % 100 != 0) or (x % 400 == 0) else 365)

days_since = crash_date - start_of_year
print('days since')
print(days_since)

df['Crash_Date_Sin'] = np.sin(2 * np.pi * (days_since / divisor))
df['Crash_Date_Cos'] = np.sin(2 * np.pi * (days_since / divisor))
"""


# encoding
categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
categorical_columns.remove('Crash Date')

"""
# one hot encoding
encoder = OneHotEncoder(sparse_output=False)
one_hot_encoded = encoder.fit_transform(df[categorical_columns])

one_hot_df = pd.DataFrame(one_hot_encoded, columns=encoder.get_feature_names_out(categorical_columns))
# one_hot_df.reset_index(drop=True) - put this on pd.concat for one hot encoding
"""

encoder = ce.BinaryEncoder(cols=categorical_columns)
df_encoded = encoder.fit_transform(df)

# df = df.drop(categorical_columns, axis=1)

# df_encoded = pd.concat([df.reset_index(drop=True), ], axis=1)

print(df_encoded.info())
for i in df_encoded.columns:
    print(df_encoded[i].value_counts())
    print()

df_encoded.to_csv('encoded_data_binary_encoding.csv', index=False)
"""

# Prep data for imputation
df.replace('No Data', np.nan, inplace=True)

print(f'Before\n\n\n: {df}')

imputer = KNNImputer(n_neighbors=2)
df = imputer.fit_transform(df)

print(f'After\n\n\n: {df}')
print('\n\n\n\n' + df['Adjusted Average Daily Traffic Amount'])

# normalization, encoding


SANITY CHECKS

# get rows and cols


# get general info


# no missing values!!!

# checking for duplicates
print(df.duplicated().sum())

# checking for garbage values



DISPLAY DATA TO IDENTIFY PATTERNS

# histogram
for col in df.columns:
    sns.histplot(data=df, x=col)
    plt.show()

# scatterplot
for i in df.select_dtypes(include='number').columns:
    sns.scatterplot(data=df, x=i, y='Speed Limit')
    plt.show()

# heatmap would be sns.heatmap


"""






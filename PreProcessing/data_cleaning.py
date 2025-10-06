import pandas as pd 
import category_encoders as ce
import os
import glob

class DataCleaner:

    def __init__(self):
        files = self.get_files()
        df = self.files_to_dfs(files)
        self.final_df = self.clean_df(df)
        

    """
    Get data from data folder of Accinet
    """
    def get_files(self):
        path = 'data' 
        files = glob.glob(os.path.join(path, '*.csv'))
        return files
    

    """
    Change raw csvs into dataframes
    """
    def files_to_df(self, files):
        all_dfs = []
        for filename in files:
            cur_df = pd.read_csv(filename, index_col=None, header=0, skiprows=10)
            all_dfs.append(cur_df)
        df = pd.concat(all_dfs)


    """
    Get rid of any bad rows in the data frame
    """
    def clean_df(self, raw_df):
        raw_df = self.fix_long_lat(raw_df)
        raw_df = self.fix_unknown_other(raw_df)
        raw_df = self.drop_missing_data(raw_df)
        raw_df = self.change_to_numbers(raw_df)
        raw_df = self.change_to_bool(raw_df)
        return raw_df
    

    """
    Fixing longitude/latitude columns
    """
    def fix_long_lat(self, df) -> pd.DataFrame:
        df = df[df['Longitude'] != 'No Data']    
        df = df[df['Latitude'] != 'No Data']  
        df['Latitude'] = pd.to_numeric(df['Latitude'])
        df['Longitude'] = pd.to_numeric(df['Longitude'])
        return df


    """
    Get rid of OTHER and UNKNOWN
    """
    def fix_unknown_other(self, df) -> pd.DataFrame:
        df = df[df['Light Condition'] != '99 - UNKNOWN']
        df = df[df['Light Condition'] != '98 - OTHER (EXPLAIN IN NARRATIVE)']
        df = df[df['Light Condition'] != '4 - DARK, UNKNOWN LIGHTING']
        df = df[df['Weather Condition'] != '99 - UNKNOWN']
        df = df[df['Weather Condition'] != '98 - OTHER (EXPLAIN IN NARRATIVE)']
        df = df[df['Road Class'] != 'OTHER ROADS']
        return df


    """
    Get rid of rows with missing data
    """
    def drop_missing_data(self, df):
        df = df[df['Speed Limit'] != -1]
        df = df.drop(columns=['Surface Type'])
        df = df[df['Adjusted Average Daily Traffic Amount'] != 'No Data']
        df = df[df['Percentage of Single Unit Truck Average Daily Traffic'] != 'No Data']
        return df
        

    """
    Change strings to numbers so model can be trained on them
    """
    def change_to_numbers(self, df) -> pd.DataFrame:
        df['Adjusted Average Daily Traffic Amount'] = pd.to_numeric(df['Adjusted Average Daily Traffic Amount'])
        df['Percentage of Single Unit Truck Average Daily Traffic'] = pd.to_numeric(df['Percentage of Single Unit Truck Average Daily Traffic'])
        df['Hour of Day'] = df['Hour of Day'].str[:2]
        df['Hour of Day'] = pd.to_numeric(df['Hour of Day'])
        return df


    """
    Change strings to bools so model can be trained on them
    """
    def change_to_bool(self, df) -> pd.DataFrame:
        mapping = {'Yes': True, 'No': False}
        df['Rural Flag'] = df['Rural Flag'].map(mapping)
        df['Construction Zone Flag'] = df['Construction Zone Flag'].map(mapping)
        return df
    

    """
    Encode the data with binary encoder
    """
    def encode_data(self, df):
        categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
        categorical_columns.remove('Crash Date')
        encoder = ce.BinaryEncoder(cols=categorical_columns)
        df_encoded = encoder.fit_transform(df)
        return df_encoded
    
    """
    Create csv
    """
    def create_csv(self, df):
        self.final_df.to_csv('encoded_data_binary_encoding.csv', index=False)
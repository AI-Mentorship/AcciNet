from sklearn.model_selection import train_test_split
import pandas as pd

"""
Turn dataframe into X and y training and testing data
"""
def prepare_data(df):
    features = df.iloc[:, :-1].values
    target = df.iloc[:, -1].values
    X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42)
    return {'X_train': X_train, 'X_test': X_test, 'y_train': y_train, 'y_test': y_test}


"""
Get equal amounts zero and one rows --> may end up going in the ensemble file but keeping it here for now
"""
def sample_zero_rows(self, df):
    rows_1 = df.loc[df['label'] == 1]
    rows_0 = df.loc[df['label'] == 0]
    rows_0 = rows_0.sample(n=len(rows_1), random_state=42)
    return pd.concat([rows_0, rows_1], axis=0)
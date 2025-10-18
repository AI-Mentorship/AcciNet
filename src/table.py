from sklearn.model_selection import TimeSeriesSplit
import pandas as pd

def load_and_split_data(file_path):
    # Load dataset
    df = pd.read_csv(file_path)
    
    df["Crash Date"] = pd.to_datetime(df["Crash Date"])
    df = df.sort_values(["Crash Date", "Hour of Day"]).reset_index(drop=True)
    
    # Drop temporal columns before splitting
    y = df["label"]
    X = df.drop(columns=["label", "Crash Date", "Hour of Day"])
    
    # Only fetches the last split (80%-20%)
    # Gap = 6, 42 or 180 but marginal change in results 
    ts = TimeSeriesSplit(n_splits=2, test_size=int(len(X) * 0.2))
    train_index, test_index = list(ts.split(X))[-1]
    
    X_train, X_test = X.iloc[train_index], X.iloc[test_index]
    y_train, y_test = y.iloc[train_index], y.iloc[test_index]

    return X_train, X_test, y_train, y_test
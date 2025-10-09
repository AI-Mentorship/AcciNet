from sklearn.model_selection import train_test_split
import pandas as pd

def load_and_split_data(file_path):
    # Load dataset
    df = pd.read_csv(file_path)
    

    # Remove Latitude and Longitude (Should be done elsewhere!!!)
    df = df.drop(columns=["Latitude", "Longitude"])
    df_0 = df[df["label"] == 0]
    df_1 = df[df["label"] == 1]

    # Balance the dataset by undersampling the majority class
    df = pd.concat([df_0.sample(len(df_1), random_state=42), df_1], axis=0)
    X = df.drop(columns=["label"])
    y = df["label"]

    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    return X_train, X_test, y_train, y_test
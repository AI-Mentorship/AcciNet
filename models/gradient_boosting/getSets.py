import pandas as pd
from sklearn.model_selection import train_test_split

# 1. Load dataset
df = pd.read_csv("data/final/true_preprocessed_data.csv")

df0 = df[df["label"] == 0]
df1 = df[df["label"] == 1]

df0 = df0.sample(df1.shape[0])

df = pd.concat([df0, df1], ignore_index=True)

X = df.drop(columns="label")
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

def getTrainData():
    return (X_train, y_train)

def getTestData():
    return (X_test, y_test)
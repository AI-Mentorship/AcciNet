import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score,accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
from imblearn.under_sampling import RandomUnderSampler
import pickle

# 1. Load dataset
df = pd.read_csv("data/final/preprocessed_data.csv")

df0 = df[df["label"] == 0]
df1 = df[df["label"] == 1]

df0 = df0.sample(df1.shape[0])

df = pd.concat([df0, df1], ignore_index=True)

X = df.drop(columns="label")
y = df["label"]


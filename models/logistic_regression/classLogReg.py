import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import commons 

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.utils import resample
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    roc_curve, auc
)

class LogisticModel:


    def __init__(self):
        # Load data
        raw_df = pd.read_csv('data/processed/preprocessed_data.csv').drop(['Latitude', 'Longitude'], axis=1)
        
        # Separate majority and minority classes
        df_balanced = commons.sample_zero_rows(self, raw_df)
        print("Class distribution after downsampling:")
        print(df_balanced["label"].value_counts(), "\n")

        self.model_data = commons.prepare_data(df_balanced)

        scaler = StandardScaler()
        self.model_data['X_train'] = scaler.fit_transform(self.model_data['X_train'])
        self.model_data['X_test'] = scaler.transform(self.model_data['X_test'])
            
        self.model = LogisticRegression(class_weight="balanced", random_state=42)
        

        # df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)

    
    def train(self):
        self.model.fit(self.model_data['X_train'], self.model_data['y_train'])
        

    def predict(self):
        return self.model.predict(self.model_data['X_test'])

    def display_stats(self, y_pred):
        accuracy = accuracy_score(self.model_data['y_test'],y_pred)
        precision = precision_score(self.model_data['y_test'],y_pred)
        recall = recall_score(self.model_data['y_test'], y_pred)
        f1 = f1_score(self.model_data['y_test'], y_pred)
        #cm = confusion_matrix(self.model_data['y_test'], y_pred)

        self.model_data["y_test"]

        print("\n--- Model Evaluation ---")
        print(f"Accuracy:  {accuracy:.2f}")
        print(f"Precision: {precision:.2f}")
        print(f"Recall:    {recall:.2f}")
        print(f"F1 Score:  {f1:.2f}")
        print("\nClassification Report:\n", classification_report(self.model_data['y_test'], y_pred))
        print("\nClassification Report:\n", classification_report(self.model_data['y_test'], y_pred))

x = LogisticModel()
x.train()
y_pred=x.predict()
x.display_stats(y_pred)
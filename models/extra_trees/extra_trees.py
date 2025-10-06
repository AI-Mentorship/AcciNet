import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.ensemble import ExtraTreesClassifier

class ExtraTrees:

    def __init__(self):
        raw_df = pd.read_csv('data/processed/preprocessed_data.csv').drop(['Latitude', 'Longitude'], axis=1)
        self.df = self.sample_zero_rows(self, raw_df)
        self.model_data = self.prepare_data(raw_df)  # will be a dictionary with training and testing data
        self.model = ExtraTreesClassifier(n_estimators=100, random_state=42)

        

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier

class RandomForest:

    def __init__(self):
        raw_df = pd.read_csv('data/processed/preprocessed_data.csv').drop(['Latitude', 'Longitude'], axis=1)
        self.df = self.sample_zero_rows(self, raw_df)
        self.model_data = self.prepare_data(raw_df)  # will be a dictionary with training and testing data
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)

    """
    Turn dataframe into X and y training and testing data
    """
    def prepare_data(self):
        features = self.df.iloc[:, :-1].values
        target = self.df.iloc[:, -1].values
        X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42)
        return {'X_train': X_train, 'X_test': X_test, 'y_train': y_train, 'y_test': y_test}


    """
    Get equal amounts zero and one rows
    """
    def sample_zero_rows(self, df):
        rows_1 = df.loc[df['label'] == 1]
        rows_0 = df.loc[df['label'] == 0]
        rows_0 = rows_0.sample(n=len(rows_1), random_state=42)
        return pd.concat([rows_0, rows_1], axis=0)
    

    """
    Train the model
    """
    def train(self, X_train, y_train):
        self.model.fit(X_train, y_train)


    """
    Predict the likelihood of getting into a crash with the model
    """
    def predict(self, X_test):
        return self.model.predict_proba(X_test)[:, 1]

    
    """
    See stats of model
    """
    def display_stats(self, y_pred):
        accuracy = accuracy_score(self.model_data['y_test'], y_pred)
        print(f'Accuracy: {accuracy * 100:.2f}%')
        print(classification_report(y_true=self.model_data['y_test'], y_pred=y_pred))

        feature_importance = pd.DataFrame({
            'feature': (self.df.drop('label', axis=1)).columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)

        print("\nTop 20 Most Important Features:")
        print(feature_importance.head(20).to_string(index=False))

        print(f"\nTotal features: {len(feature_importance)}")
        print(f"Features with zero importance: {(feature_importance['importance'] == 0).sum()}")

        conf_matrix = confusion_matrix(self.model_data['y_test'], y_pred)

        plt.figure(figsize=(8, 6))
        sns.heatmap(conf_matrix, annot=True, fmt='g', cmap='Blues', cbar=False)

        plt.title('Confusion Matrix Heatmap')
        plt.xlabel('Predicted crash')
        plt.ylabel('Actual Crash')
        plt.show()
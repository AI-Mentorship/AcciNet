import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv('preprocessed_data.csv').drop(['Latitude', 'Longitude'], axis=1)

rows_1 = df.loc[df['label'] == 1]
rows_0 = df.loc[df['label'] == 0]

rows_0 = rows_0.sample(n=len(rows_1), random_state=42)

updated_entries = pd.concat([rows_0, rows_1], axis=0)

features = updated_entries.iloc[:, :-1].values
target = updated_entries.iloc[:, -1].values

"""
X_train, y_train: 80% of the data used to train the model.
X_test, y_test: 20% of the data used to test the model.
test_size=0.2: means 20% of data goes to testing.
random_state=42: ensures you get the same split every time
"""

X_train, X_test, y_train, y_test = train_test_split(features, target, test_size=0.2, random_state=42)

classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)
y_pred = classifier.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print(f'Accuracy: {accuracy * 100:.2f}%')
print(classification_report(y_true=y_test, y_pred=y_pred))

# Feature Importance Analysis
feature_importance = pd.DataFrame({
    'feature': (df.drop('label', axis=1)).columns,
    'importance': classifier.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 20 Most Important Features:")
print(feature_importance.head(20).to_string(index=False))

print(f"\nTotal features: {len(feature_importance)}")
print(f"Features with zero importance: {(feature_importance['importance'] == 0).sum()}")

conf_matrix = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix, annot=True, fmt='g', cmap='Blues', cbar=False)

plt.title('Confusion Matrix Heatmap')
plt.xlabel('Predicted crash')
plt.ylabel('Actual Crash')
plt.show()
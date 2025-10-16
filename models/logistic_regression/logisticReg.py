import sys
print(sys.path)

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.utils import resample
from sklearn.metrics import (
   accuracy_score, precision_score, recall_score,
   f1_score, confusion_matrix, classification_report,
   roc_curve, auc
)

df = pd.read_csv("preprocessed_data.csv")


# Separate majority and minority classes
df_majority = df[df.label == 0]
df_minority = df[df.label == 1]


# Downsample majority class to match minority
df_majority_downsampled = resample(
   df_majority,
   replace=False,
   n_samples=len(df_minority),
   random_state=42
)


# Combine balanced data
df_balanced = pd.concat([df_majority_downsampled, df_minority])
df_balanced = df_balanced.sample(frac=1, random_state=42).reset_index(drop=True)


# Check class distribution
print("Class distribution after downsampling:")
print(df_balanced["label"].value_counts())


#features and target
X_balanced = df_balanced.drop("label", axis=1)
y_balanced = df_balanced["label"]




#training and testing
X_train, X_test, y_train, y_test = train_test_split(
   X_balanced, y_balanced,
   test_size=0.2,
   random_state=42,
   stratify=y_balanced
)
#standardize the features
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)
#train the model
model = LogisticRegression(class_weight="balanced", random_state=42)
model.fit(X_train, y_train)


#make predictions, evaluate model
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
cm = confusion_matrix(y_test, y_pred)
#evaluate the model
print("\n--- Model Evaluation ---")
print(f"Accuracy:  {accuracy:.2f}")
print(f"Precision: {precision:.2f}")
print(f"Recall:    {recall:.2f}")
print(f"F1 Score:  {f1:.2f}")
print("\nConfusion Matrix:\n", cm)
print("\nClassification Report:\n", classification_report(y_test, y_pred))
#ROC Curve & AUC
fpr, tpr, thresholds = roc_curve(y_test, y_prob)
roc_auc = auc(fpr, tpr)


plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color='blue', lw=2,
        label=f'ROC Curve (AUC = {roc_auc:.2f})')
plt.plot([0, 1], [0, 1], color='red', lw=2, linestyle='--', label='Random Baseline')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve: Logistic Regression')
plt.legend(loc="lower right")
plt.show()
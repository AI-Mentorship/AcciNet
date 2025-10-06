import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score,accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
from imblearn.under_sampling import RandomUnderSampler
import pickle

# 1. Load dataset
df = pd.read_csv("../data/final/preprocessed_data.csv")

df0 = df[df["label"] == 0]
df1 = df[df["label"] == 1]

df0 = df0.sample(df1.shape[0])

df = pd.concat([df0, df1], ignore_index=True)

X = df.drop(columns="label")
y = df["label"]

print(y)
# 2. Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

# 3. Compute sample weights to handle class imbalance

# 4. Create and train the Gradient Boosted Classifier
model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=3,
    random_state=42
)
model.fit(X_train, y_train)



# 5. Make predictions
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]  # probability for positive class

# 6. Evaluatef
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))
print("ROC-AUC Score:", roc_auc_score(y_test, y_proba))

print("Accuracy:", accuracy_score(y_test, y_pred))
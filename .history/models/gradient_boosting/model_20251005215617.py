import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score,accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
from imblearn.under_sampling import RandomUnderSampler
import pickle
from getSets import getTestData

(y_train, y_test) = getTestData()

# 3. Compute sample weights to handle class imbalance

# 4. Create and train the Gradient Boosted Classifier
model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=3,
    random_state=42
)
model.fit(X_train, y_train)

with open("gradient_boosting_model.pkl", "wb") as f:
    pickle.dump(model, f)
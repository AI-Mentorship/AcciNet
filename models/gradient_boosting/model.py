from sklearn.ensemble import GradientBoostingClassifier
import pickle
# from getSets import getTestData
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.table import load_and_split_data

(X_train, _, y_train, _) = load_and_split_data()

# 3. Compute sample weights to handle class imbalance

# 4. Create and train the Gradient Boosted Classifier
model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

with open("models/gradient_boosting/gradient_boosting_model.pkl", "wb") as f:
    pickle.dump(model, f)
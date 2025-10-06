from sklearn.ensemble import GradientBoostingClassifier
import pickle
from getSets import getTestData

(X_train, y_train) = getTestData()

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
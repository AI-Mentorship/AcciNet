from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score,accuracy_score
import pickle
from getSets import getTestData, getListFeatures
import pandas as pd
import matplotlib.pyplot as plt
with open("models/gradient_boosting/gradient_boosting_model.pkl", "rb") as f:
    model = pickle.load(f)

    (X_test, y_test) = getTestData()

    # 5. Make predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]  # probability for positive class

    # 6. Evaluatef
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    print("ROC-AUC Score:", roc_auc_score(y_test, y_proba))

    print("Accuracy:", accuracy_score(y_test, y_pred))

    importances = model.feature_importances_

    createdTable = pd.DataFrame({
        'feature': getListFeatures(),
        'importance': importances
    }).sort_values('importance', ascending=False)

    print(createdTable)

    plt.figure(figsize=(10, 6))
    plt.barh(createdTable['feature'], createdTable['importance'])
    plt.gca().invert_yaxis()  # Highest importance at top
    plt.xlabel("Importance")
    plt.ylabel("Feature")
    plt.title("Feature Importance (Gradient Boosting)")
    plt.show()
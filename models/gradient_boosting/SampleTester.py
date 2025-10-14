from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score,accuracy_score
import pickle
from getSets import getTestData
with open("models/gradient_boosting/gradient_boosting_model.pkl", "rb") as f:
    model = pickle.load(f)

    (X_test, y_test) = getTestData()

    i = 18

    # 5. Make predictions
    y_pred = model.predict(X_test.iloc[[i]])[0]

    y_actual = y_test.iloc[i]
    print(f"Predicted is {y_pred}, actual was {y_actual}.\nActual data was {X_test.iloc[i]}")
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, log_loss
from ensemble import ensemble_predictions, weighted_ensemble_predictions
from src.table import load_and_split_data
from models.random_forest.model import RandomForest
from models.extra_trees.model import ExtraTrees
from models.gradient_boosting.shyam.model import GradientBoosting
from models.logistic_regression.model import LogisticModel

def evaluate_predictions(y_test, y_pred_soft, y_pred_hard):

    print("=== Soft Predictions Metrics ===\n")
    # Classification report for soft predictions
    print("Classification Report (Soft Predictions):")
    print(classification_report(y_test, (y_pred_soft >= 0.5).astype(int)))

    # Confusion matrix for soft predictions
    print("Confusion Matrix (Soft Predictions):")
    print(confusion_matrix(y_test, (y_pred_soft >= 0.5).astype(int)))

    # ROC AUC and Log Loss for soft predictions
    auc = roc_auc_score(y_test, y_pred_soft)
    ll = log_loss(y_test, y_pred_soft)
    print(f"\nROC AUC Score (Soft Predictions): {auc:.4f}")
    print(f"Log Loss (Soft Predictions): {ll:.4f}")

    print("\n=== Hard Predictions Metrics ===\n")
    # Classification report for hard predictions
    print("Classification Report (Hard Predictions):")
    print(classification_report(y_test, y_pred_hard))

    # Confusion matrix for hard predictions
    print("Confusion Matrix (Hard Predictions):")
    print(confusion_matrix(y_test, y_pred_hard))

def main():
    # Predefined CSV file path
    file_path = './data/final/true_preprocessed_data.csv'

    # Define models 
    models = [RandomForest(), ExtraTrees(), GradientBoosting(), LogisticModel()
    ]

    weights = [0.25, 0.25, 0.25, 0.25]  

    # Run ensemble predictions
    X_train, X_test, y_train, y_test = load_and_split_data(file_path)
    # y_pred_soft, y_pred_hard = ensemble_predictions(models, X_train, X_test, y_train)
    y_pred_soft, y_pred_hard = weighted_ensemble_predictions(models, weights, X_train, X_test, y_train)

    # Evaluate predictions
    evaluate_predictions(y_test, y_pred_soft, y_pred_hard)

if __name__ == "__main__":
    main()
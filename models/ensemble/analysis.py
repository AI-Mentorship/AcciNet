from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, log_loss
from ensemble import ensemble_predictions  
from table import load_and_split_data

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
    file_path = ''

    # Define models 
    models = [
    ]

    # Run ensemble predictions
    X_train, X_test, y_train, y_test = load_and_split_data(file_path)
    y_pred_soft, y_pred_hard = ensemble_predictions(models, X_train, X_test, y_train, y_test)

    # Evaluate predictions
    evaluate_predictions(y_test, y_pred_soft, y_pred_hard)

if __name__ == "__main__":
    main()
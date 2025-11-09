from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, log_loss
from models.extra_trees.model import ExtraTrees
from src.table import load_and_split_data

def evaluate_predictions(y_test, y_pred):

    print("=== Metrics ===\n")
    # Classification report 
    print("Classification Report:")
    print(classification_report(y_test, (y_pred >= 0.5).astype(int)))

    # Confusion matrix
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, (y_pred >= 0.5).astype(int)))

    # ROC AUC and Log Loss 
    auc = roc_auc_score(y_test, y_pred)
    ll = log_loss(y_test, y_pred)
    print(f"\nROC AUC Score: {auc:.4f}")
    print(f"Log Loss: {ll:.4f}")

def main():
    # Predefined CSV file path

    file_path = './data/final/true_preprocessed_data.csv'

    X_train, X_test, y_train, y_test = load_and_split_data(file_path)

    model = ExtraTrees()
    model.train(X_train, y_train)
    y_pred = model.predict(X_test)

    # Evaluate predictions
    evaluate_predictions(y_test, y_pred)

if __name__ == "__main__":
    main()
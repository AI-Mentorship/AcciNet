import numpy as np

def ensemble_predictions(models, X_train, X_test, y_train):
    preds_soft = []
    preds_hard = []
    for model in models:
        model.train(X_train, y_train)
        y_pred_proba = model.predict(X_test)
        y_pred_class = (y_pred_proba >= 0.5).astype(int)
        preds_soft.append(y_pred_proba)
        preds_hard.append(y_pred_class)
    preds_soft = np.array(preds_soft)
    preds_hard = np.array(preds_hard)
    preds_soft = np.mean(preds_soft, axis=0)
    preds_hard = np.round(np.mean(preds_hard, axis=0)).astype(int)
    return preds_soft, preds_hard

def weighted_ensemble_predictions(models, weights, X_train, X_test, y_train):
    weights = np.array(weights)
    
    preds_soft = []
    preds_hard = []
    for model in models:
        model.train(X_train, y_train)
        y_pred_proba = model.predict(X_test)
        y_pred_class = (y_pred_proba >= 0.5).astype(int)
        preds_soft.append(y_pred_proba)
        preds_hard.append(y_pred_class)
    
    preds_soft = np.array(preds_soft)
    preds_hard = np.array(preds_hard)
    
    preds_soft = np.average(preds_soft, axis=0, weights=weights)
    
    preds_hard = (np.average(preds_hard, axis=0, weights=weights) >= 0.5).astype(int)
    
    return preds_soft, preds_hard

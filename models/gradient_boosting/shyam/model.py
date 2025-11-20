import lightgbm as lgb

class GradientBoosting:
    def __init__(self):
        self.model = lgb.LGBMClassifier(
        objective="binary",
        metric="binary_logloss",
        boosting_type="gbdt",
        max_depth=-1,
        learning_rate=0.1,
        n_estimators=100,
        random_state=42,
        n_jobs=-1,
        verbose=1
    )

    def train(self, X_train, y_train):
        self.model.fit(X_train, y_train)

    def predict(self, X_test):
        return self.model.predict_proba(X_test)[:, 1]
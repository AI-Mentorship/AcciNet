from sklearn.ensemble import ExtraTreesClassifier

class ExtraTrees:
    def __init__(self):
        self.model = ExtraTreesClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=-1
        )

    def train(self, X_train, y_train):
        self.model.fit(X_train, y_train)

    def predict(self, X_test):
        return self.model.predict_proba(X_test)[:, 1]
import numpy as np
import matplotlib
matplotlib.use('Agg')
import sys, os

if '__file__' in globals():
    sys.path.append(os.path.dirname(__file__))
else:
    sys.path.append(os.getcwd())

import pandas as pd
import matplotlib.pyplot as plt
import shap
from random_forest import RandomForest

print("Loading model...")
rf = RandomForest()
X_train, X_test = rf.model_data["X_train"], rf.model_data["X_test"]
y_train, y_test = rf.model_data["y_train"], rf.model_data["y_test"]

print(X_test)

print("Training...")
rf.train(X_train, y_train)

print("Creating SHAP explainer...")
explainer = shap.TreeExplainer(rf.model, model_output = "raw")

# Uses 20 samples due to slow computation time
n_samples = 20
sample_indices = np.random.choice(X_test.shape[0], size=n_samples, replace=False)

# Sampled rows from the array
sampled_rows = X_test[sample_indices]

print("Computing SHAP values...")
shap_values = explainer.shap_values(sampled_rows)

if isinstance(shap_values, list):
    shap_values = shap_values[1]
elif len(shap_values.shape) == 3:
    shap_values = shap_values[:, :, 1]

feature_names = list(rf.df.drop('label', axis=1).columns)
os.makedirs('shap_plots', exist_ok=True)

# Gets base value correctly
if isinstance(explainer.expected_value, list):
    base_value = explainer.expected_value[1]
elif hasattr(explainer.expected_value, '__len__'):
    base_value = explainer.expected_value[1]
else:
    base_value = explainer.expected_value

# 1. Waterfall Plot
print("Creating waterfall plot...")
explanation = shap.Explanation(
    values=shap_values[0], 
    base_values=float(base_value), 
    data=sampled_rows[0], 
    feature_names=feature_names
)
shap.waterfall_plot(explanation, show=False)
plt.tight_layout()
plt.savefig('shap_plots/waterfall_plot.png', dpi=300, bbox_inches='tight')
plt.close()

# 2. Summary Plot
print("Creating summary plot...")
plt.figure(figsize=(12, 8))
shap.summary_plot(shap_values, sampled_rows, feature_names=feature_names, show=False)
plt.tight_layout()
plt.savefig('shap_plots/summary_plot.png', dpi=300, bbox_inches='tight')
plt.close()

# 3. Bar Plot
print("Creating bar plot...")
plt.figure(figsize=(12, 8))
shap.summary_plot(shap_values, sampled_rows, feature_names=feature_names, plot_type="bar", show=False)
plt.tight_layout()
plt.savefig('shap_plots/bar_plot.png', dpi=300, bbox_inches='tight')
plt.close()

print("Done!")

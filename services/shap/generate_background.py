# services/shap/generate_background.py
import numpy as np
import joblib

# Generate sample background data matching model input shape
background = np.random.randn(100, 60, 10).astype(np.float32)  # 100 samples, 60 timesteps, 10 features
joblib.dump(background, 'services/shap/data/background_sample.pkl')
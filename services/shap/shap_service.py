# services/shap/shap_service.py
from flask import Flask, request, jsonify
import numpy as np
import shap
import tensorflow as tf
import joblib

app = Flask(__name__)

# Load model and sample background data
model = tf.keras.models.load_model('services/shap/models/lstm_model.h5')
background_data = joblib.load('services/shap/data/background_sample.pkl')

# Initialize explainer with proper background data
explainer = shap.DeepExplainer(model, background_data)

@app.route('/shap', methods=['POST'])
def calculate_shap():
    data = request.json
    instances = np.array(data['instances'])
    shap_values = explainer.shap_values(instances)
    return jsonify({
        'shap_values': [v.tolist() for v in shap_values],
        'base_values': explainer.expected_value.tolist()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
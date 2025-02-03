// src/config/env.js
import 'dotenv/config';

export default {
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  SHAP_SERVICE_URL: process.env.SHAP_SERVICE_URL,
  MODEL_PATH: process.env.MODEL_SAVE_PATH
};
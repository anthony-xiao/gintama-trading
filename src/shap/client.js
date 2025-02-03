// src/shap/client.js
import axios from 'axios';

export class SHAPClient {
  constructor() {
    this.serviceUrl = process.env.SHAP_SERVICE_URL;
  }

  async getSHAPValues(instances) {
    const config = {
        timeout: parseInt(process.env.SHAP_TIMEOUT),
        retry: {
          retries: parseInt(process.env.SHAP_MAX_RETRIES),
          retryDelay: (retryCount) => {
            return retryCount * 1000;
          }
        }
      };    
    try {
      const response = await axios.post(`${this.serviceUrl}/shap`, {
        instances: instances.arraySync() // Convert TensorFlow tensor to JS array
      });
      return {
        values: tf.tensor(response.data.shap_values),
        base: response.data.base_values
      };
    } catch (error) {
      console.error('SHAP Error:', error);
      return null;
    }
  }
}

// src/utils/shapClient.js
import axios from 'axios';
import { log } from './logger.js';

export class SHAPClient {
  constructor() {
    this.serviceUrl = process.env.SHAP_SERVICE_URL || 'http://localhost:5000';
    this.timeout = 5000; // 5 seconds
    this.maxRetries = 3;
  }

  async getSHAPValues(tensorData) {
    const instances = tensorData.arraySync();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(`${this.serviceUrl}/shap`, {
          instances: instances
        }, {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.data?.shap_values) {
          throw new Error('Invalid SHAP response format');
        }

        return tf.tensor(response.data.shap_values);

      } catch (error) {
        log(`SHAP attempt ${attempt} failed: ${error.message}`, 'WARN');
        if (attempt === this.maxRetries) {
          log('Falling back to uniform feature weights', 'ERROR');
          return tf.ones([tensorData.shape[2]]); // Return equal weights
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async getFeatureWeights(tensorData) {
    const shapValues = await this.getSHAPValues(tensorData);
    return tf.mean(shapValues, [0, 1]).abs(); // Average across batches and time steps
  }
}
// src/scripts/train.js
import { fetchBars } from '../data/historical.js';
import { fetchQuotes } from '../data/quotes.js';
import { generateFeatures } from '../features/core.js';
import { calculateLabels } from '../features/labels.js';
import { DynamicLSTM } from '../models/DynamicLSTM.js';
import { saveModel } from '../models/utils.js';
import { log } from '../utils/logger.js';
import { stddev } from '../utils/math.js';
import * as tf from '@tensorflow/tfjs-node';

// Configuration
const CHUNK_SIZE = 5000; // Process 5k bars at a time
const LOOKBACK = 60;
const SYMBOL = process.env.SYMBOL || 'SPY';
const DAYS = process.env.DAYS || 7;

// Memory tracking
let peakMemory = 0;
const memoryInterval = setInterval(() => {
  const memory = process.memoryUsage();
  peakMemory = Math.max(peakMemory, memory.heapUsed);
  log(`Memory: ${Math.round(memory.heapUsed/1024/1024)}MB (Peak: ${Math.round(peakMemory/1024/1024)}MB)`);
}, 5000);

async function main() {
  try {
    log(`Starting training for ${SYMBOL} (${DAYS} days)`);
    
    // 1. Initialize streaming pipeline
    const model = new DynamicLSTM();
    let sequenceBuffer = [];
    let chunkCount = 0;

    // 2. Stream data in chunks
    for await (const chunk of streamData()) {
      log(`Processing chunk ${++chunkCount} (${chunk.bars.length} bars)`);
      
      // 3. Process chunk with tensor cleanup
      await tf.tidy(() => {
        const X = tf.tensor3d(chunk.sequences.map(s => s.X));
        const y = tf.tensor1d(chunk.sequences.map(s => s.y), 'int32');
        return model.train(X, y);
      });

      // 4. Explicit memory cleanup
      tf.disposeVariables();
      await tf.nextFrame();
    }

    // 5. Finalize and save model
    const modelPath = `models/${SYMBOL}-${new Date().toISOString()}`;
    await saveModel(model, modelPath);
    log(`Model saved to ${modelPath}`);

  } catch (error) {
    log(`Training failed: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    clearInterval(memoryInterval);
  }
}

async function* streamData() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - DAYS);

  for (let offset = 0; ; offset += CHUNK_SIZE) {
    // 1. Fetch chunked data
    const [bars, quotes] = await Promise.all([
      fetchBars(SYMBOL, startDate, endDate, CHUNK_SIZE, offset),
      fetchQuotes(SYMBOL, startDate, endDate, CHUNK_SIZE, offset)
    ]);

    if (bars.length === 0) break;

    // 2. Align and process data
    const aligned = alignData(bars, quotes);
    const features = generateFeatures(aligned.bars, aligned.quotes);
    const labels = calculateLabels(aligned.bars);
    const sequences = createSequences(features, labels);

    // 3. Yield processed chunk
    yield { sequences };

    // 4. Force cleanup
    bars.length = 0;
    quotes.length = 0;
    features.length = 0;
    labels.length = 0;
  }
}

function createSequences(features, labels) {
  const sequences = [];
  for (let i = LOOKBACK; i < features.length; i++) {
    sequences.push({
      X: features.slice(i - LOOKBACK, i).map(f => Object.values(f)),
      y: labels[i]
    });
  }
  return sequences;
}

// Optimized alignment using temporal joins
function alignData(bars, quotes) {
  const quoteMap = new Map();
  const interval = 60000; // 1 minute
  
  quotes.forEach(q => {
    const bucket = Math.floor(q.timestamp / interval) * interval;
    quoteMap.set(bucket, (quoteMap.get(bucket) || []).concat(q));
  });

  return {
    bars: bars.map(bar => ({
      ...bar,
      quotes: quoteMap.get(bar.time.getTime()) || []
    }))
  };
}

// Run with optimized memory config
main();
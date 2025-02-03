# services/shap/train_model.py
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Concatenate, Attention
import joblib


# Generate sample data
X_train = np.random.randn(1000, 60, 15)  # 1000 samples, 60 timesteps, 15 features
y_train = np.random.randint(0, 3, 1000)  # 3 classes: [SELL, HOLD, BUY]

joblib.dump(X_train[:100], 'services/shap/data/background_sample.pkl') 

# Input layer
inputs = Input(shape=(60, 15))

# LSTM layers
lstm_out = LSTM(128, return_sequences=True)(inputs)

# Attention mechanism
attention = Attention()([lstm_out, lstm_out])  # Self-attention
concat = Concatenate()([lstm_out, attention])

# Second LSTM
lstm_final = LSTM(64)(concat)

# Output layer
outputs = Dense(3, activation='softmax')(lstm_final)

# Build model
model = Model(inputs, outputs)

# Compile
model.compile(optimizer='adam',
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])



# Train
model.fit(X_train, y_train, epochs=10, batch_size=64, validation_split=0.2)


model.compile(optimizer='adam',
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])

# Save
model.save('./models/lstm_model.h5')
print("Model saved to ./models/lstm_model.h5")

import os
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

# -----------------------------
# 1. Create DEMO training data
# -----------------------------

np.random.seed(42)

n = 2000

temperature = np.random.uniform(5, 35, n)
humidity = np.random.uniform(30, 95, n)
wind_speed = np.random.uniform(0.5, 8, n)
pressure = np.random.uniform(995, 1030, n)

# Demo relationship for prototype testing only
pm25 = (
    220
    - 2.2 * temperature
    + 1.4 * humidity
    - 13 * wind_speed
    + 0.35 * (pressure - 1010)
    + np.random.normal(0, 15, n)
)

pm25 = np.maximum(pm25, 10)

df = pd.DataFrame({
    "temperature": temperature,
    "humidity": humidity,
    "wind_speed": wind_speed,
    "pressure": pressure,
    "pm25": pm25
})

# Save dataset
os.makedirs("data", exist_ok=True)
df.to_csv("data/demo_pm25_dataset.csv", index=False)

# -----------------------------
# 2. Prepare features
# -----------------------------

X = df[
    [
        "temperature",
        "humidity",
        "wind_speed",
        "pressure"
    ]
]

y = df["pm25"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# -----------------------------
# 3. Train XGBoost model
# -----------------------------

model = XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42
)

model.fit(X_train, y_train)

# -----------------------------
# 4. Evaluate
# -----------------------------

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))

print("\nSWAAS BASELINE MODEL")
print("--------------------")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")

# -----------------------------
# 5. Save model
# -----------------------------

os.makedirs("model", exist_ok=True)

joblib.dump(
    model,
    "model/pm25_model.joblib"
)

print("\nModel saved successfully:")
print("model/pm25_model.joblib")
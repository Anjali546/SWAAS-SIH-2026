from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import math
import os
import joblib
import numpy as np
app = FastAPI(title="SWAAS Demo API", version="1.0")
MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "model",
    "pm25_model.joblib"
)

model = None

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def make_forecast(low_confidence=False):
    vals = []

    for i, h in enumerate([0, 6, 12, 24, 36, 48, 60, 72]):

        # Demo weather conditions changing with forecast horizon
        temperature = 18.4 + 0.08 * math.sin(h / 6)
        humidity = 68 + 5 * math.sin(h / 8)
        wind_speed = 2.1 + 0.4 * math.cos(h / 7)
        pressure = 1012 + 2 * math.sin(h / 10)

        # Use trained XGBoost model
        if model is not None:
            features = np.array([[
                temperature,
                humidity,
                wind_speed,
                pressure
            ]])

            pm = float(model.predict(features)[0])
        else:
            pm = 182

        # Confidence decreases with forecast horizon
        if low_confidence:
            confidence = max(40, 82 - i * 4.0)
        else:
            confidence = max(55, 82 - i * 3.5)

        # Uncertainty spread
        spread = 17 + i * 2.8

        if low_confidence:
            spread += 12

        vals.append({
            "hour": "Now" if h == 0 else f"+{h}h",
            "pm25": round(pm),
            "low": round(pm - spread),
            "high": round(pm + spread),
            "confidence": round(confidence)
        })

    return vals

def base_hotspots(low_confidence=False):
    return [
        {"name":"East Delhi","lat":28.63,"lon":77.29,"pm25":245 if low_confidence else 235,
         "trend":"Rising","trust":54 if low_confidence else 68,"risk":"HIGH" if low_confidence else "MEDIUM"},
        {"name":"Anand Vihar","lat":28.65,"lon":77.32,"pm25":232,"trend":"Rising","trust":61,"risk":"MEDIUM"},
        {"name":"Central Delhi","lat":28.64,"lon":77.22,"pm25":188,"trend":"Stable","trust":79,"risk":"LOW"},
        {"name":"Dwarka","lat":28.59,"lon":77.04,"pm25":142,"trend":"Stable","trust":86,"risk":"LOW"},
    ]

@app.get("/api/health")
def health():
    return {"status":"ok","service":"SWAAS Demo API"}

@app.get("/api/dashboard")
def dashboard(scenario: str = "normal"):
    low = scenario == "low_confidence"
    trust = 54 if low else 82
    risk = "HIGH" if low else "LOW"
    reasons = (
        ["Model disagreement", "Wind shift detected", "Observation gap"]
        if low else
        ["Data quality acceptable", "Models broadly agree", "No rapid environmental shift"]
    )
    return {
        "location":"Delhi NCR",
        "demo_data":True,
        "current":{
            "pm25":182,
            "aqi_label":"High",
            "temperature":18.4,
            "humidity":68,
            "wind_speed":2.1
        },
        "trust_score":trust,
        "failure_risk":risk,
        "failure_reasons":reasons,
        "hotspots":base_hotspots(low),
        "forecast":make_forecast(low),
        "recommendation":{
            "zone":"East Delhi",
            "priority":"HIGH" if low else "MEDIUM",
            "reason":"Low forecast confidence with rising PM2.5 and rapid wind change." if low
                     else "East Delhi shows rising PM2.5; continue monitoring.",
            "action":"Additional observation recommended." if low
                     else "Continue monitoring and validate incoming observations."
        }
    }

@app.get("/api/forecast")
def forecast(scenario: str = "normal"):
    return {"location":"Delhi NCR","horizon_hours":72,"demo_data":True,
            "forecast":make_forecast(scenario=="low_confidence")}

@app.get("/api/hotspots")
def hotspots(scenario: str = "normal"):
    return {"location":"Delhi NCR","demo_data":True,"hotspots":base_hotspots(scenario=="low_confidence")}

@app.get("/api/reliability")
def reliability(scenario: str = "normal"):
    low = scenario == "low_confidence"

    # Get the current model forecast
    forecast_data = make_forecast(low_confidence=low)

    # Calculate average forecast confidence
    avg_confidence = sum(
        item["confidence"] for item in forecast_data
    ) / len(forecast_data)

    # Calculate average uncertainty spread
    avg_spread = sum(
        item["high"] - item["low"]
        for item in forecast_data
    ) / len(forecast_data)

    # Higher uncertainty reduces trust
    uncertainty_penalty = max(0, (avg_spread - 34) * 0.8)

    trust_score = round(
        0.7 * forecast_data[0]["confidence"]
        + 0.3 * avg_confidence
        - uncertainty_penalty
    )

    trust_score = max(0, min(100, trust_score))

    # Failure risk based on dynamic reliability
    if trust_score < 60:
        failure_risk = "HIGH"
    elif trust_score < 75:
        failure_risk = "MEDIUM"
    else:
        failure_risk = "LOW"

    # Dynamic components
    data_quality = max(50, round(92 - uncertainty_penalty))
    model_agreement = max(45, round(avg_confidence))
    prediction_uncertainty = max(
        35,
        round(100 - avg_spread)
    )
    recent_forecast_error = max(
        45,
        round(100 - uncertainty_penalty * 1.5)
    )
    environmental_stability = max(
        40,
        round(100 - avg_spread * 0.7)
    )

    reasons = []

    if avg_spread > 55:
        reasons.append("High prediction uncertainty")

    if avg_confidence < 60:
        reasons.append("Forecast confidence is declining")

    if low:
        reasons.append("Model disagreement")
        reasons.append("Rapid environmental change")

    if not reasons:
        reasons.append("Forecast conditions currently stable")

    return {
        "trust_score": trust_score,
        "failure_risk": failure_risk,
        "components": {
            "data_quality": data_quality,
            "model_agreement": model_agreement,
            "prediction_uncertainty": prediction_uncertainty,
            "recent_forecast_error": recent_forecast_error,
            "environmental_stability": environmental_stability
        },
        "metrics": {
            "MAE": 14.03,
            "RMSE": 17.45,
            "bias": 3.2
        },
        "failure_reasons": reasons,
        "forecast_confidence": round(avg_confidence, 1),
        "average_uncertainty": round(avg_spread, 1),
        "demo_data": True
    }


@app.get("/api/model-prediction")
def model_prediction():
    if model is None:
        return {
            "status": "error",
            "message": "PM2.5 model not found"
        }

    temperature = 18.4
    humidity = 68
    wind_speed = 2.1
    pressure = 1012

    features = np.array([[
        temperature,
        humidity,
        wind_speed,
        pressure
    ]])

    prediction = model.predict(features)[0]

    return {
        "status": "success",
        "prediction_pm25": round(float(prediction), 2),
        "inputs": {
            "temperature": temperature,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "pressure": pressure
        },
        "model": "XGBoost baseline"
    }
@app.get("/api/forecast-72h")
def forecast_72h():
    if model is None:
        return {
            "status": "error",
            "message": "PM2.5 model not found"
        }

    start_time = datetime.now()
    forecast = []

    for hour in range(1, 73):
        # Demo weather variation for 72 hours
        temperature = 18.4 + 0.08 * math.sin(hour / 6)
        humidity = 68 + 5 * math.sin(hour / 8)
        wind_speed = 2.1 + 0.4 * math.cos(hour / 7)
        pressure = 1012 + 2 * math.sin(hour / 10)

        features = np.array([[
            temperature,
            humidity,
            wind_speed,
            pressure
        ]])

        prediction = model.predict(features)[0]

        forecast_time = start_time + timedelta(hours=hour)

        forecast.append({
            "hour": hour,
            "time": forecast_time.strftime("%Y-%m-%d %H:%M"),
            "pm25": round(float(prediction), 2),
            "temperature": round(float(temperature), 2),
            "humidity": round(float(humidity), 2),
            "wind_speed": round(float(wind_speed), 2),
            "pressure": round(float(pressure), 2)
        })

    return {
        "status": "success",
        "forecast_hours": 72,
        "model": "XGBoost baseline",
        "data_type": "Demo forecast",
        "forecast": forecast
    }
# SWAAS SIH 2026 — Demo-Ready MVP

This prototype is based on the supplied 6-page SWAAS SIH 2026 presentation.

## MVP implemented
- 72-hour PM2.5 forecast visualization
- Forecast Trust Score (0–100)
- Forecast Failure Risk
- Hotspot/spatial view
- Smart Observation Recommendation
- Forecast vs Actual / reliability metrics
- Low-confidence episode demo scenario
- React frontend + FastAPI backend

## Important
This starter uses clearly labelled DEMO MODE values. Do not present these values as live Delhi measurements.
Replace the demo API/data with validated AQ + weather sources before claiming real-time operational forecasting.

## Run backend (Windows)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

API: http://127.0.0.1:8000
Health: http://127.0.0.1:8000/api/health

## Run frontend
Open a second terminal:
cd frontend
npm install
npm run dev

Open the URL shown by Vite, normally:
http://localhost:5173

## Demo flow
1. Open Dashboard.
2. Show PM2.5, Trust Score, Failure Risk and Hotspots.
3. Open 72h Forecast.
4. Switch Demo scenario to "Low-confidence episode".
5. Show Trust Score falling to 54 and HIGH failure risk.
6. Open Hotspots and show East Delhi priority.
7. Open Reliability and explain trust components + MAE/RMSE/bias.
8. Return to Dashboard and explain the Detect → Predict → Explain → Trust → Sense → Warn → Learn loop.

## Next upgrades
- Real historical AQ/weather dataset
- Real API ingestion
- Trained XGBoost baseline on validated data
- SHAP explainability
- PostGIS spatial storage
- LSTM/GRU/ensemble
- Forecast-vs-actual automated recalibration
- Authentication and cloud deployment

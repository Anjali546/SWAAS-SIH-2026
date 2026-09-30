import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const API = 'https://swaas-sih-2026-2.onrender.com';

const fallback = {
  location: "Delhi NCR",
  demo_data: true,
  current: { pm25: 182, aqi_label: "High", temperature: 18.4, humidity: 68, wind_speed: 2.1 },
  trust_score: 82,
  failure_risk: "LOW",
  failure_reasons: ["Data quality acceptable", "Models broadly agree", "No rapid environmental shift"],
  hotspots: [
    {name:"East Delhi", lat:28.63, lon:77.29, pm25:245, trend:"Rising", trust:54, risk:"HIGH"},
    {name:"Anand Vihar", lat:28.65, lon:77.32, pm25:232, trend:"Rising", trust:61, risk:"MEDIUM"},
    {name:"Central Delhi", lat:28.64, lon:77.22, pm25:188, trend:"Stable", trust:79, risk:"LOW"},
    {name:"Dwarka", lat:28.59, lon:77.04, pm25:142, trend:"Stable", trust:86, risk:"LOW"}
  ],
  forecast: [
    {hour:"Now", pm25:182, low:165, high:199, confidence:82},
    {hour:"+6h", pm25:190, low:173, high:209, confidence:80},
    {hour:"+12h", pm25:198, low:177, high:221, confidence:77},
    {hour:"+24h", pm25:212, low:186, high:241, confidence:72},
    {hour:"+36h", pm25:226, low:193, high:259, confidence:68},
    {hour:"+48h", pm25:235, low:196, high:276, confidence:64},
    {hour:"+60h", pm25:229, low:187, high:271, confidence:61},
    {hour:"+72h", pm25:218, low:174, high:262, confidence:58}
  ],
  recommendation: {
    zone:"East Delhi",
    priority:"HIGH",
    reason:"Low forecast confidence with rising PM2.5 and rapid wind change.",
    action:"Additional observation recommended."
  }
};

function App() {
  const [data, setData] = useState(fallback);
  const [modelPrediction, setModelPrediction] = useState(null);
  const [reliability, setReliability] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState("normal");

  async function refresh(s = scenario) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard?scenario=${s}`);
if (!res.ok) throw new Error("API unavailable");

const dashboardData = await res.json();

try {
  const forecastRes = await fetch(`${API}/api/forecast-72h`);

  if (forecastRes.ok) {
    const forecastData = await forecastRes.json();

    if (forecastData.status === "success") {
      dashboardData.forecast = forecastData.forecast.map((item) => ({
        hour: `+${item.hour}h`,
        pm25: item.pm25,
        low: Math.round(item.pm25 * 0.92),
        high: Math.round(item.pm25 * 1.08),
        confidence: Math.max(55, 90 - item.hour * 0.4)
      }));
    }
  }
} catch {
  console.log("72h forecast unavailable");
}

setData(dashboardData);

try {
    const modelRes = await fetch(`${API}/api/model-prediction`);

    if (modelRes.ok) {
        const modelData = await modelRes.json();
        setModelPrediction(modelData);
    }
    try {
  const reliabilityRes = await fetch(
    `${API}/api/reliability?scenario=${s}`
  );

  if (reliabilityRes.ok) {
    const reliabilityData = await reliabilityRes.json();
    setReliability(reliabilityData);
  }
} catch {
  console.log("Reliability data unavailable");
}
} catch {
    console.log("Model prediction unavailable");
}
    } catch {
      setData(s === "low_confidence" ? {
        ...fallback,
        trust_score:54,
        failure_risk:"HIGH",
        failure_reasons:["Model disagreement","Wind shift detected","Observation gap"],
        recommendation:{zone:"East Delhi",priority:"HIGH",reason:"Model disagreement + wind shift reduced confidence.",action:"Additional observation recommended."}
      } : fallback);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  const statusClass = data.failure_risk === "HIGH" ? "danger" : data.failure_risk === "MEDIUM" ? "warn" : "good";

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">SWAAS</div>
          <div className="brand-sub">Smart Weather & Air Quality Support System</div>
        </div>
        <div className="header-right">
          <span className="demo-pill">DEMO MODE</span>
          <span>Delhi NCR</span>
        </div>
      </header>

      <nav className="nav">
        {[
          ["dashboard","Dashboard"],["forecast","72h Forecast"],["hotspots","Hotspots"],["reliability","Reliability"],["precautions","Precautions"]
        ].map(([id,label]) => <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}
        <button className="refresh" onClick={()=>refresh()}>{loading ? "Updating…" : "↻ Refresh"}</button>
      </nav>

      <main className="content">
        <div className="hero">
          <div>
            <div className="eyebrow">FORECAST INTELLIGENCE</div>
            <h1>From forecasting to <span>forecast intelligence</span></h1>
            <p>Forecast value + uncertainty + reliability + actionable observation guidance.</p>
          </div>
          <div className="scenario-box">
            <label>Demo scenario</label>
            <select value={scenario} onChange={e=>{setScenario(e.target.value); refresh(e.target.value)}} >
              <option value="normal">Normal conditions</option>
              <option value="low_confidence">Low-confidence episode</option>
            </select>
          </div>
        </div>

        {tab === "dashboard" && <Dashboard
  data={data}
  statusClass={statusClass}
  setTab={setTab}
  modelPrediction={modelPrediction}
  reliability={reliability}
/>}
        {tab === "forecast" && (
  <Forecast
    data={data}
    modelPrediction={modelPrediction}
    reliability={reliability}
  />
)}
        {tab === "hotspots" && <Hotspots data={data} />}
        {tab === "reliability" && <Reliability data={data} statusClass={statusClass} reliability={reliability} />}
{tab === "precautions" && <Precautions />}
        <footer>
          <b>SWAAS • Team VisionX • SIH 2026</b>
          <span>Prototype • Reliability-aware AI decision layer</span>
          
        </footer>
      </main>
    </div>
  );
}

 function Cards({data, statusClass, modelPrediction, reliability}) {
  return <div className="cards">
    <Card title="CURRENT PM2.5" value={`${data.current.pm25} µg/m³`} sub={`${data.current.aqi_label}`} />
    <Card
  title="FORECAST TRUST"
  value={reliability ? `${reliability.trust_score}/100` : "Loading..."}
  sub={
    reliability
      ? `Dynamic reliability • Confidence ${reliability.forecast_confidence}`
      : "Loading reliability..."
  }
  accent="green"
/>
    <Card
  title="FAILURE RISK"
  value={reliability ? reliability.failure_risk : "Loading..."}
  sub={
    reliability && reliability.failure_reasons
      ? reliability.failure_reasons[0]
      : "Loading reliability..."
  }
  accent={
    reliability && reliability.failure_risk === "HIGH"
      ? "red"
      : reliability && reliability.failure_risk === "MEDIUM"
      ? "orange"
      : "green"
  }
/>
    <Card title="HOTSPOTS" value={data.hotspots.length} sub="Zones requiring attention" accent="orange" />

    <Card
      title="XGBOOST MODEL"
      value={
        modelPrediction
          ? `${modelPrediction.prediction_pm25} µg/m³`
          : "Loading..."
      }
      sub="AI baseline • MAE 14.03 • RMSE 17.45"
      accent="purple"
    />
  </div>
}

function Card({title,value,sub,accent=""}) {
  return <div className={`card ${accent}`}><div className="card-title">{title}</div><div className="card-value">{value}</div><div className="card-sub">{sub}</div></div>
}

function Dashboard({data,statusClass,setTab,modelPrediction,reliability}) {
  return <>
    <Cards
  data={data}
  statusClass={statusClass}
  modelPrediction={modelPrediction}
  reliability={reliability}
/>
    <div className="grid2">
      <Panel title="72-HOUR PM2.5 FORECAST" action={<button className="text-btn" onClick={()=>setTab("forecast")}>Open forecast →</button>}>
        <ForecastChart data={data.forecast}/>
      </Panel>
      <Panel title="FORECAST RELIABILITY">
        <div className="trust">
          <div className="trust-ring" style={{"--score":`${data.trust_score}%`}}>
            <div><strong>{data.trust_score}</strong><small>/100</small></div>
          </div>
          <div>
            <h3>{data.trust_score >= 75 ? "High confidence" : "Low confidence"}</h3>
            <p>Trust combines data quality, model agreement, uncertainty and recent forecast behaviour.</p>
            <div className="mini-meter"><span style={{width:`${data.trust_score}%`}}/></div>
          </div>
        </div>
        <div className={`alert ${statusClass}`}>
          <b>{data.failure_risk === "HIGH" ? "⚠ Forecast failure risk" : "✓ Forecast status stable"}</b>
          <div>{data.failure_reasons.join(" • ")}</div>
        </div>
      </Panel>
    </div>
    <div className="grid2">
      <Panel title="DELHI NCR HOTSPOT MAP" action={<button className="text-btn" onClick={()=>setTab("hotspots")}>View zones →</button>}>
        <FakeMap hotspots={data.hotspots}/>
      </Panel>
      <Panel title="SMART OBSERVATION RECOMMENDATION">
        <div className="recommend">
          <div className="recommend-icon">◎</div>
          <div><div className="eyebrow">PRIORITY {data.recommendation.priority}</div><h2>{data.recommendation.zone}</h2><p>{data.recommendation.reason}</p><b>{data.recommendation.action}</b></div>
        </div>
      </Panel>
    </div>
    <Panel title="LOW-CONFIDENCE EPISODE — DEMO FLOW">
      <Timeline data={data}/>
    </Panel>
  </>
}

function Forecast({data, modelPrediction, reliability}) {
  return <>
    <Cards
  data={data}
  statusClass={data.failure_risk==="HIGH"?"danger":"good"}
  modelPrediction={modelPrediction}
  reliability={reliability}
/>
    <Panel title="72-HOUR MULTI-HORIZON PM2.5 FORECAST">
      <ForecastChart data={data.forecast} tall/>
    </Panel>
    <div className="grid2">
      <Panel title="PREDICTION RANGE">
        <div className="table-wrap"><table><thead><tr><th>Horizon</th><th>PM2.5</th><th>Range</th><th>Confidence</th></tr></thead><tbody>
        {data.forecast.map((r,i)=><tr key={i}><td>{r.hour}</td><td><b>{r.pm25}</b></td><td>{r.low}–{r.high}</td><td><span className={r.confidence<70?"badge warn":"badge good"}>{Number(r.confidence).toFixed(1)}%</span></td></tr>)}
        </tbody></table></div>
      </Panel>
      <Panel title="MODEL OUTPUT">
        <div className="model-box"><b>Baseline forecast model</b><p>XGBoost / ensemble-ready architecture</p><div className="kv"><span>Input</span><b>Weather + historical PM2.5</b></div><div className="kv"><span>Output</span><b>Multi-horizon PM2.5</b></div><div className="kv"><span>Uncertainty</span><b>Prediction interval</b></div></div>
      </Panel>
      <Panel title="FORECAST SUMMARY">
  <div className="summary-grid">
    <div>
      <small>Peak PM2.5</small>
{" "}
<strong>
  {Math.max(...data.forecast.map(r => r.pm25))} µg/m³
</strong>
    </div>

    <div>
      <small>Peak Horizon</small>
{" "}
<strong>
        {data.forecast.reduce((a, b) =>
          b.pm25 > a.pm25 ? b : a
        ).hour}
      </strong>
    </div>

    <div>
      <small>Current Confidence</small>
{" "}
<strong>
        {data.forecast[0].confidence}%
      </strong>
    </div>
  </div>
</Panel>
    </div>
  </>
}
function Precautions() {
  return (
    <Panel title="AIR QUALITY PRECAUTIONS">
      <div className="precautions-grid">

        <div className="precaution-card">
          <div className="precaution-icon">😷</div>
          <h3>Use Protection</h3>
          <p>Consider appropriate respiratory protection when air pollution levels are high.</p>
        </div>

        <div className="precaution-card">
          <div className="precaution-icon">🏠</div>
          <h3>Reduce Outdoor Exposure</h3>
          <p>Limit prolonged outdoor exposure during high pollution episodes.</p>
        </div>

        <div className="precaution-card">
          <div className="precaution-icon">🚗</div>
          <h3>Avoid Unnecessary Travel</h3>
          <p>Reduce unnecessary outdoor travel when pollution conditions deteriorate.</p>
        </div>

        <div className="precaution-card">
          <div className="precaution-icon">🌬️</div>
          <h3>Monitor Air Quality</h3>
          <p>Check the SWAAS forecast, trust score and alerts before making decisions.</p>
        </div>

        <div className="precaution-card">
          <div className="precaution-icon">👶</div>
          <h3>Protect Sensitive Groups</h3>
          <p>Take additional precautions for children, older adults and people with respiratory sensitivity.</p>
        </div>

        <div className="precaution-card">
          <div className="precaution-icon">⚠️</div>
          <h3>Follow Official Alerts</h3>
          <p>Use SWAAS as decision support and follow official public-health and emergency guidance.</p>
        </div>

      </div>
    </Panel>
  );
}
function Hotspots({data}) {
  return <>
    <Panel title="SPATIAL HOTSPOT & PROPAGATION INTELLIGENCE">
      <FakeMap hotspots={data.hotspots} large/>
    </Panel>
    <div className="hotspot-grid">{data.hotspots.map((h,i)=><div className="hotspot-card" key={i}><div className="hotspot-dot"/><div><h3>{h.name}</h3><p>PM2.5 <b>{h.pm25}</b> µg/m³ • Trend <b>{h.trend}</b></p><div className="kv"><span>Trust</span><b>{h.trust}/100</b></div><div className="kv"><span>Risk</span><b className={h.risk==="HIGH"?"red":""}>{h.risk}</b></div></div></div>)}</div>
  </>
}

function Reliability({data,statusClass,reliability}) {
  return <>
    <div className="reliability-hero"><div><div className="eyebrow">FORECAST TRUST SCORE</div><div className="big-score">{reliability?.trust_score ?? data.trust_score}<small>/100</small></div><p>Dynamic reliability indicator for the current forecast.</p></div><div className={`risk-card ${statusClass}`}><span>FAILURE RISK</span><strong>{data.failure_risk}</strong><p>{data.failure_reasons.join(" • ")}</p></div></div>
    <div className="grid2">
      <Panel title="TRUST COMPONENTS">
        {["Data quality","Model agreement","Prediction uncertainty","Recent forecast error","Environmental stability"].map((x,i)=><div className="component" key={x}><span>{x}</span><div className="component-bar"><i style={{width:`${[92,78,71,83,86][i]}%`}}/></div><b>{[92,78,71,83,86][i]}%</b></div>)}
      </Panel>
      <Panel title="FORECAST VS ACTUAL">
        <LineChart width={500} height={260} data={data.forecast} margin={{left:0,right:15,top:10,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour"/><YAxis/><Tooltip/>
          <Line type="monotone" dataKey="pm25" stroke="#0b3a66" strokeWidth={3} dot={false}/>
          <Line type="monotone" dataKey="low" stroke="#4a9" strokeDasharray="5 5" dot={false}/>
        </LineChart>
        <div className="metrics"><span>MAE <b>18.4</b></span><span>RMSE <b>24.1</b></span><span>Bias <b>+3.2</b></span></div>
      </Panel>
    </div>
  </>
}

function ForecastChart({data,tall=false}) {
  return <div style={{height:tall?390:280}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:10,right:20,left:0,bottom:0}}>
    <defs><linearGradient id="pm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1678b8" stopOpacity={0.35}/><stop offset="100%" stopColor="#1678b8" stopOpacity={0.03}/></linearGradient></defs>
    <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="hour"/><YAxis/><Tooltip/>
    <Area type="monotone" dataKey="high" stroke="#d8892b" fill="none" strokeDasharray="5 5"/>
    <Area type="monotone" dataKey="low" stroke="#43a47a" fill="none" strokeDasharray="5 5"/>
    <Area type="monotone" dataKey="pm25" stroke="#1678b8" strokeWidth={3} fill="url(#pm)"/>
  </AreaChart></ResponsiveContainer></div>
}

function FakeMap({hotspots,large=false}) {
  return <div className={`fake-map ${large?"large":""}`}>
    <div className="map-label">DELHI NCR • DEMO SPATIAL VIEW</div>
    <div className="map-road r1"/><div className="map-road r2"/><div className="map-road r3"/>
    {hotspots.map((h,i)=><div key={i} className={`map-marker ${h.risk.toLowerCase()}`} style={{left:`${20+i*19}%`,top:`${65-i*13}%`}} title={h.name}><span>{h.pm25}</span></div>)}
    <div className="map-legend"><span><i className="dot low"/>Low</span><span><i className="dot medium"/>Medium</span><span><i className="dot high"/>High</span></div>
  </div>
}

function Timeline({data}) {
  const low = data.trust_score < 70 || data.failure_risk === "HIGH";
  const events = [
    ["18:00","PM2.5 forecast rising in East Delhi"],
    ["18:05",`Trust Score ${low ? "falls: 82% → 54%" : "stable: 82%"}`],
    ["18:07",low ? "Failure risk: model disagreement + wind shift" : "No failure signal detected"],
    ["18:10",low ? "SWAAS recommends additional observation" : "Monitoring continues"],
    ["18:30","New observation arrives; forecast updated"],
    ["Later","Prediction compared with reality for recalibration"]
  ];
  return <div className="timeline">{events.map(([t,e],i)=><div className="event" key={t}><div className={`time t${i}`}>{t}</div><div>{e}</div></div>)}</div>
}
function Panel({title,action,children}) { return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section> }

export default App;

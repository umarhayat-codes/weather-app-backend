import express from "express";
import axios from "axios";

const router = express.Router();
const API_KEY = process.env.OPENWEATHER_API_KEY;
const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const UV_URL = "https://api.openweathermap.org/data/2.5/uvi";

router.get("/city", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "City is required" });

    // Step 1 → Get coordinates
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
    const geoRes = await axios.get(geoUrl);
    const geoData = geoRes.data;

    if (!geoData.length) return res.json({ error: "City not found" });

    const { lat, lon, name, country } = geoData[0];

    // Step 2 → Current weather
    const currentRes = await axios.get(CURRENT_URL, {
      params: { lat, lon, appid: API_KEY, units: "metric" },
    });
    const current = currentRes.data;

    // Step 3 → Forecast
    const forecastRes = await axios.get(FORECAST_URL, {
      params: { lat, lon, appid: API_KEY, units: "metric" },
    });
    const forecast = forecastRes.data;

    // Step 4 → UV index
    const uvRes = await axios.get(UV_URL, {
      params: { lat, lon, appid: API_KEY },
    });
    const uvData = uvRes.data;

    // Step 5 → Extract info
    const dt = new Date(current.dt * 1000);
    const dayName = dt.toLocaleDateString("en-US", { weekday: "long" });
    const timeNow = dt.toLocaleTimeString("en-US", { hour12: false });

    const feels_like = current.main.feels_like;
    const humidity = current.main.humidity;
    const wind_speed = current.wind.speed;
    const temp_min = current.main.temp_min;
    const temp_max = current.main.temp_max;
    const rain_prob = current.rain ? current.rain["1h"] || 0 : 0;
    const uv_index = uvData.value || "N/A";

    // Step 6 → Next days temperature
    const nextDays = {};
    if (forecast.list) {
      forecast.list.forEach((item) => {
        const dateTxt = item.dt_txt.split(" ")[0];
        const day = new Date(dateTxt).toLocaleDateString("en-US", { weekday: "long" });
        if (!nextDays[day]) nextDays[day] = Math.round(item.main.temp * 10) / 10;
      });
    }

    delete nextDays[dayName]; // remove today

    // Step 7 → Send response
    res.json({
      city: name,
      country,
      day: dayName,
      time: timeNow,
      feels_like,
      humidity,
      wind_speed,
      rain_probability: rain_prob,
      uv_index,
      temp_min,
      temp_max,
      next_days_temperature: nextDays,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

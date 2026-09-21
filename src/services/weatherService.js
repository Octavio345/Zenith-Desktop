const API_KEY = "d77668673cf15b7d0488f921007cbd6b"
const WEATHER_CACHE_KEY = "zenithWeatherCache"
const WEATHER_CACHE_TTL = 30 * 60 * 1000

const getWeatherCache = (city, state) => {
  if (typeof window === "undefined") return null
  try {
    const cache = JSON.parse(window.localStorage.getItem(WEATHER_CACHE_KEY) || "{}")
    return cache[`${String(city).toLowerCase()}|${String(state).toLowerCase()}`] || null
  } catch {
    return null
  }
}

const saveWeatherCache = (city, state, data) => {
  if (typeof window === "undefined" || !data) return
  try {
    const cache = JSON.parse(window.localStorage.getItem(WEATHER_CACHE_KEY) || "{}")
    cache[`${String(city).toLowerCase()}|${String(state).toLowerCase()}`] = {
      data,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // O clima continua funcionando mesmo quando o armazenamento está indisponível.
  }
}

export async function getWeatherByCity(city, state) {
  const cached = getWeatherCache(city, state)
  if (cached?.data && Date.now() - Number(cached.savedAt || 0) < WEATHER_CACHE_TTL) {
    return cached.data
  }
  try {
    if (!city || !state) return null
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${encodeURIComponent(state)},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    )
    const weather = await response.json()

    if (Number(weather.cod) !== 200) {
      return cached?.data || null
    }

    const result = {
      temperature: Math.round(weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like),
      humidity: weather.main.humidity,
      windSpeed: Math.round((weather.wind?.speed || 0) * 3.6),
      rain: weather.rain?.["1h"] || 0,
      conditionDescription: weather.weather?.[0]?.description || "Condição atual",
      description: weather.weather?.[0]?.description || "Condição atual",
      icon: weather.weather?.[0]?.icon || "",
      updatedAt: new Date().toISOString()
    }
    saveWeatherCache(city, state, result)
    return result

  } catch (error) {
    console.error("Erro ao buscar clima:", error)
    return cached?.data || null
  }
}

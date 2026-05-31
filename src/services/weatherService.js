const API_KEY = "d77668673cf15b7d0488f921007cbd6b"

export async function getWeatherByCity(city, state) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},${state},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    ) 

    const data = await response.json()

    if (data.cod !== 200) {
      console.error("Cidade não encontrada:", data.message)
      return null
    }

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity
    }

  } catch (error) {
    console.error("Erro ao buscar clima:", error)
    return null
  }
}
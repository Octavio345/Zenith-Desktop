import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw"
import "leaflet-draw/dist/leaflet.draw.css"
import { useFarm } from "./hooks/useFarm"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import "../../../styles/App/MapaTab.css"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const STORAGE_KEY = "farmPolygons"
const DEFAULT_CENTER = [-15.7801, -47.9292]
const FARM_COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#a78bfa", "#f97316"]

const onlyDigits = (value) => String(value || "").replace(/\D/g, "")

const isBrazilianCep = (value) => onlyDigits(value).length === 8

const normalizeCep = (value) => onlyDigits(value).replace(/^(\d{5})(\d{3})$/, "$1-$2")

const readNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getBrasilApiCoordinates(data) {
  const coordinates = data?.location?.coordinates
  const lat = readNumber(coordinates?.latitude ?? coordinates?.[1])
  const lng = readNumber(coordinates?.longitude ?? coordinates?.[0])

  if (lat === null || lng === null) return null
  return { lat, lng }
}

function getAwesomeApiCoordinates(data) {
  const lat = readNumber(data?.lat)
  const lng = readNumber(data?.lng)

  if (lat === null || lng === null) return null
  return { lat, lng }
}

function makeCepPlace(coordinates, cepData, originalCep) {
  return {
    lat: coordinates.lat,
    lon: coordinates.lng,
    display_name: [
      cepData?.street || cepData?.address || cepData?.logradouro,
      cepData?.neighborhood || cepData?.district || cepData?.bairro,
      cepData?.city || cepData?.localidade,
      cepData?.state || cepData?.uf,
      normalizeCep(originalCep),
      "Brasil"
    ].filter(Boolean).join(", ")
  }
}

async function fetchBrasilApiCep(cep) {
  const digits = onlyDigits(cep)
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`)

  if (!response.ok) throw new Error("CEP indisponivel")

  const data = await response.json()
  const coordinates = getBrasilApiCoordinates(data)

  return {
    data,
    coordinates
  }
}

async function fetchAwesomeApiCep(cep) {
  const digits = onlyDigits(cep)
  const response = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`)

  if (!response.ok) throw new Error("CEP indisponivel")

  const data = await response.json()
  const coordinates = getAwesomeApiCoordinates(data)

  return {
    data,
    coordinates
  }
}

async function fetchCepAddress(cep) {
  const digits = onlyDigits(cep)
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)

  if (!response.ok) throw new Error("CEP indisponivel")

  const data = await response.json()
  if (data?.erro) throw new Error("CEP nao encontrado")

  return data
}

function buildCepSearchQueries(cepData, originalCep) {
  const cep = normalizeCep(originalCep)
  const cityState = [cepData.localidade, cepData.uf].filter(Boolean).join(", ")
  const fullAddress = [
    cepData.logradouro,
    cepData.bairro,
    cepData.localidade,
    cepData.uf,
    "Brasil"
  ].filter(Boolean).join(", ")

  return [
    fullAddress,
    `${cep}, ${cityState}, Brasil`,
    `${cityState}, Brasil`,
    `${cep}, Brasil`
  ].filter((query, index, list) => query.trim() && list.indexOf(query) === index)
}

function resultMatchesCep(place, originalCep) {
  const expected = onlyDigits(originalCep)
  const displayDigits = onlyDigits(place?.display_name)
  const address = place?.address || {}
  const postcodeDigits = onlyDigits(address.postcode)

  return postcodeDigits === expected || displayDigits.includes(expected)
}

async function geocodeQueries(queries, { cep } = {}) {
  for (const query of queries) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=br&addressdetails=1`
    )
    const data = await response.json()

    if (data?.length) {
      if (!cep) return data[0]

      const exactCepResult = data.find((place) => resultMatchesCep(place, cep))
      if (exactCepResult) return exactCepResult
    }
  }

  return null
}

function formatArea(areaHa) {
  if (!Number.isFinite(areaHa) || areaHa <= 0) return "0 ha"
  if (areaHa < 1) return `${Math.round(areaHa * 10000).toLocaleString("pt-BR")} m²`
  return `${areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`
}

function normalizeCoordinates(coordinates = []) {
  return coordinates
    .map((point) => {
      if (Array.isArray(point)) return [Number(point[0]), Number(point[1])]
      return [Number(point?.lat), Number(point?.lng)]
    })
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
}

function getLayerCoordinates(layer) {
  const latLngs = layer.getLatLngs()
  const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs
  return ring.map(({ lat, lng }) => [lat, lng])
}

function calculateAreaHa(coordinates) {
  const points = normalizeCoordinates(coordinates).map(([lat, lng]) => L.latLng(lat, lng))

  if (points.length < 3) return 0

  if (L.GeometryUtil?.geodesicArea) {
    return Math.abs(L.GeometryUtil.geodesicArea(points)) / 10000
  }

  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = Math.cos((avgLat * Math.PI) / 180) * metersPerDegreeLat
  const projected = points.map((point) => ({
    x: point.lng * metersPerDegreeLng,
    y: point.lat * metersPerDegreeLat
  }))

  const areaM2 = projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0)

  return Math.abs(areaM2) / 2 / 10000
}

function polygonStyle(area, selectedAreaId) {
  const isSelected = area.id === selectedAreaId

  return {
    color: isSelected ? "#facc15" : area.color,
    fillColor: area.color,
    fillOpacity: isSelected ? 0.42 : 0.24,
    opacity: 1,
    weight: isSelected ? 4 : 2
  }
}

function createAreaFromLayer(layer, index) {
  const coordinates = getLayerCoordinates(layer)
  const id = Date.now()

  return {
    id,
    name: `Área ${index + 1}`,
    color: FARM_COLORS[index % FARM_COLORS.length],
    coordinates,
    areaHa: calculateAreaHa(coordinates),
    createdAt: new Date().toISOString()
  }
}

function normalizeSavedAreas(savedAreas) {
  if (!Array.isArray(savedAreas)) return []

  return savedAreas
    .map((area, index) => {
      const coordinates = normalizeCoordinates(area.coordinates)

      if (coordinates.length < 3) return null

      return {
        id: Number(area.id) || Date.now() + index,
        name: area.name || `Área ${index + 1}`,
        color: area.color || FARM_COLORS[index % FARM_COLORS.length],
        coordinates,
        areaHa: Number(area.areaHa) || calculateAreaHa(coordinates),
        createdAt: area.createdAt || new Date().toISOString()
      }
    })
    .filter(Boolean)
}

export default function MapaTab() {
  const { farmData } = useFarm()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const featureGroupRef = useRef(null)
  const drawHandlerRef = useRef(null)
  const editHandlerRef = useRef(null)
  const searchMarkerRef = useRef(null)
  const areaNameInputRef = useRef(null)
  const autoRenameAreaIdRef = useRef(null)
  const areasRef = useRef([])
  const selectedAreaIdRef = useRef(null)

  const [areas, setAreas] = useState([])
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [activeMode, setActiveMode] = useState("idle")
  const [searchAddress, setSearchAddress] = useState("")
  const [areaNameDraft, setAreaNameDraft] = useState("")
  const [isRenamingArea, setIsRenamingArea] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [statusMessage, setStatusMessage] = useState("Use o satélite para contornar a borda real da fazenda.")
  const [searching, setSearching] = useState(false)

  const totalArea = useMemo(
    () => areas.reduce((sum, area) => sum + (Number(area.areaHa) || 0), 0),
    [areas]
  )
  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) || null,
    [areas, selectedAreaId]
  )

  useEffect(() => {
    areasRef.current = areas
  }, [areas])

  useEffect(() => {
    selectedAreaIdRef.current = selectedAreaId
  }, [selectedAreaId])

  useEffect(() => {
    setAreaNameDraft(selectedArea?.name || "")
    const shouldAutoRename = selectedArea && autoRenameAreaIdRef.current === selectedArea.id

    setIsRenamingArea(Boolean(shouldAutoRename))

    if (shouldAutoRename) {
      autoRenameAreaIdRef.current = null
    }
  }, [selectedArea?.id])

  useEffect(() => {
    try {
      const savedAreas = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      setAreas(normalizeSavedAreas(savedAreas))
    } catch {
      setAreas([])
    }
  }, [])

  const persistAreas = (nextAreas) => {
    areasRef.current = nextAreas
    setAreas(nextAreas)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAreas))
  }

  const stopActiveTool = ({ revertEdit = false } = {}) => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.disable()
      drawHandlerRef.current = null
    }

    if (editHandlerRef.current) {
      if (revertEdit && editHandlerRef.current.revertLayers) {
        editHandlerRef.current.revertLayers()
      }

      editHandlerRef.current.disable()
      editHandlerRef.current = null
    }

    setActiveMode("idle")
  }

  const updateLayerLabel = (layer, area) => {
    const label = `
      <div class="farm-map-polygon-label">
        <strong>${area.name}</strong>
        <span>${formatArea(area.areaHa)}</span>
      </div>
    `

    layer.bindTooltip(label, {
      permanent: true,
      direction: "center",
      className: "farm-map-tooltip",
      opacity: 1
    })
  }

  const renderAreasOnMap = () => {
    if (!featureGroupRef.current) return

    featureGroupRef.current.clearLayers()

    areasRef.current.forEach((area) => {
      const layer = L.polygon(area.coordinates, polygonStyle(area, selectedAreaIdRef.current))

      layer._farmAreaId = area.id
      layer.on("click", (event) => {
        if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
        setSelectedAreaId(area.id)
      })
      updateLayerLabel(layer, area)
      featureGroupRef.current.addLayer(layer)
    })
  }

  useEffect(() => {
    renderAreasOnMap()
  }, [areas, selectedAreaId])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      preferCanvas: true
    }).setView(DEFAULT_CENTER, 5)

    mapRef.current = map
    featureGroupRef.current = new L.FeatureGroup()

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 20,
        attribution: "Tiles © Esri"
      }
    )

    const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    })

    satelliteLayer.addTo(map)
    featureGroupRef.current.addTo(map)

    L.control.zoom({ position: "bottomright" }).addTo(map)
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map)
    L.control.layers({ Satélite: satelliteLayer, Mapa: streetLayer }, null, {
      position: "topright"
    }).addTo(map)

    map.on("click", () => {
      if (drawHandlerRef.current || editHandlerRef.current) return
      setSelectedAreaId(null)
      setIsRenamingArea(false)
    })

    map.on(L.Draw.Event.CREATED, (event) => {
      const newArea = createAreaFromLayer(event.layer, areasRef.current.length)
      const nextAreas = [...areasRef.current, newArea]

      autoRenameAreaIdRef.current = newArea.id
      persistAreas(nextAreas)
      setSelectedAreaId(newArea.id)
      setStatusMessage(`${newArea.name} salva com ${formatArea(newArea.areaHa)}.`)
      stopActiveTool()
    })

    map.on(L.Draw.Event.EDITED, (event) => {
      const updatedLayers = {}

      event.layers.eachLayer((layer) => {
        updatedLayers[layer._farmAreaId] = getLayerCoordinates(layer)
      })

      const nextAreas = areasRef.current.map((area) => {
        const coordinates = updatedLayers[area.id]

        if (!coordinates) return area

        return {
          ...area,
          coordinates,
          areaHa: calculateAreaHa(coordinates)
        }
      })

      persistAreas(nextAreas)
      setStatusMessage("Bordas atualizadas e salvas.")
    })

    setTimeout(() => {
      map.invalidateSize()
      renderAreasOnMap()
    }, 180)

    return () => {
      stopActiveTool()
      map.remove()
      mapRef.current = null
      featureGroupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!farmData || !mapRef.current || areasRef.current.length > 0) return

    const farmQuery = [farmData.name, farmData.bairro, farmData.municipio, farmData.uf, farmData.cep]
      .filter(Boolean)
      .join(", ")

    if (farmQuery) setSearchAddress(farmQuery)
  }, [farmData])

  const startDrawing = () => {
    if (!mapRef.current) return

    stopActiveTool()

    drawHandlerRef.current = new L.Draw.Polygon(mapRef.current, {
      allowIntersection: false,
      showArea: false,
      showLength: false,
      metric: true,
      shapeOptions: {
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.24,
        opacity: 1,
        weight: 3
      },
      guidelineDistance: 16,
      icon: new L.DivIcon({
        className: "farm-map-draw-point",
        iconSize: new L.Point(12, 12)
      })
    })

    drawHandlerRef.current.enable()
    setSelectedAreaId(null)
    setActiveMode("drawing")
    setStatusMessage("Clique nos limites da fazenda e feche o polígono no primeiro ponto.")
  }

  const startEditing = () => {
    if (!mapRef.current || !featureGroupRef.current || featureGroupRef.current.getLayers().length === 0) {
      setStatusMessage("Crie uma área antes de ajustar as bordas.")
      return
    }

    stopActiveTool()

    editHandlerRef.current = new L.EditToolbar.Edit(mapRef.current, {
      featureGroup: featureGroupRef.current,
      selectedPathOptions: {
        color: "#facc15",
        fillColor: "#22c55e",
        fillOpacity: 0.28,
        weight: 4
      }
    })

    editHandlerRef.current.enable()
    setActiveMode("editing")
    setStatusMessage("Arraste os vértices amarelos para encaixar a borda da fazenda.")
  }

  const saveEditing = () => {
    if (!editHandlerRef.current) return

    editHandlerRef.current.save()
    editHandlerRef.current.disable()
    editHandlerRef.current = null
    setActiveMode("idle")
  }

  const deleteSelectedArea = () => {
    if (!selectedArea) return
    setDeleteDialog({ type: "single", area: selectedArea })
  }

  const confirmDeleteDialog = () => {
    if (!deleteDialog) return

    if (deleteDialog.type === "single") {
      const nextAreas = areasRef.current.filter((area) => area.id !== deleteDialog.area.id)
      persistAreas(nextAreas)
      setSelectedAreaId(null)
      setStatusMessage(`${deleteDialog.area.name} removida.`)
      setDeleteDialog(null)
      return
    }

    persistAreas([])
    setSelectedAreaId(null)
    setStatusMessage("Todas as áreas foram removidas.")
    setDeleteDialog(null)
  }

  const saveSelectedAreaName = (nameValue = areaNameInputRef.current?.value || areaNameDraft) => {
    if (!selectedArea) return

    const nextName = nameValue.trim()
    areaNameInputRef.current?.blur()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.getSelection()?.removeAllRanges()

    if (!nextName) {
      setAreaNameDraft(selectedArea.name)
      setIsRenamingArea(true)
      setStatusMessage("O nome da área não pode ficar vazio.")
      return
    }

    if (nextName === selectedArea.name) {
      setIsRenamingArea(false)
      requestAnimationFrame(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        window.getSelection()?.removeAllRanges()
      })
      return
    }

    const nextAreas = areasRef.current.map((area) =>
      area.id === selectedArea.id ? { ...area, name: nextName } : area
    )

    persistAreas(nextAreas)
    setAreaNameDraft(nextName)
    setIsRenamingArea(false)
    setStatusMessage(`${nextName} renomeada.`)

    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      window.getSelection()?.removeAllRanges()
    })
  }

  const handleAreaNameSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    saveSelectedAreaName(String(formData.get("areaName") || ""))
  }

  const clearAllAreas = () => {
    if (areasRef.current.length === 0) return
    setDeleteDialog({ type: "all" })
  }

  const focusMap = () => {
    if (!mapRef.current || !featureGroupRef.current) return

    const selectedLayer = featureGroupRef.current
      .getLayers()
      .find((layer) => layer._farmAreaId === selectedAreaId)

    if (selectedLayer) {
      mapRef.current.fitBounds(selectedLayer.getBounds(), { padding: [34, 34], maxZoom: 18 })
      return
    }

    if (featureGroupRef.current.getLayers().length > 0) {
      mapRef.current.fitBounds(featureGroupRef.current.getBounds(), { padding: [34, 34], maxZoom: 17 })
    }
  }

  const locateUser = () => {
    if (!navigator.geolocation || !mapRef.current) {
      setStatusMessage("Localização indisponível neste navegador.")
      return
    }

    setStatusMessage("Buscando localização atual...")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapRef.current.setView([coords.latitude, coords.longitude], 17)
        setStatusMessage("Mapa centralizado na sua localização.")
      },
      () => setStatusMessage("Não foi possível acessar a localização.")
    )
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const query = searchAddress.trim()

    if (!query || !mapRef.current) return

    setSearching(true)
    setStatusMessage("Buscando endereço no mapa...")

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`
      )
      const data = await response.json()

      if (!data.length) {
        setStatusMessage(isBrazilianCep(query)
          ? "CEP encontrado, mas sem coordenada exata no mapa. Tente rua, bairro, cidade/UF ou o nome da fazenda."
          : "Endereço não encontrado. Tente cidade, UF, CEP ou nome da fazenda."
        )
        return
      }

      const lat = Number(data[0].lat)
      const lng = Number(data[0].lon)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      if (searchMarkerRef.current) searchMarkerRef.current.remove()

      searchMarkerRef.current = L.marker([lat, lng]).addTo(mapRef.current)
      searchMarkerRef.current.bindPopup(data[0].display_name).openPopup()
      mapRef.current.setView([lat, lng], 17)
      setStatusMessage("Local encontrado. Agora contorne a borda real da fazenda.")
    } catch {
      setStatusMessage("Erro ao buscar endereço. Verifique a conexão e tente novamente.")
    } finally {
      setSearching(false)
    }
  }

  const handleCepAwareSearch = async (event) => {
    event.preventDefault()
    const query = searchAddress.trim()

    if (!query || !mapRef.current) return

    setSearching(true)
    setStatusMessage(isBrazilianCep(query) ? "Buscando CEP no mapa..." : "Buscando endereço no mapa...")

    try {
      let place = null

      if (isBrazilianCep(query)) {
        const { coordinates, data: brasilApiCepData } = await fetchBrasilApiCep(query).catch(() => ({ coordinates: null, data: null }))

        if (coordinates) {
          place = makeCepPlace(coordinates, brasilApiCepData, query)
        } else {
          const { coordinates: awesomeCoordinates, data: awesomeCepData } = await fetchAwesomeApiCep(query).catch(() => ({ coordinates: null, data: null }))

          if (awesomeCoordinates) {
            place = makeCepPlace(awesomeCoordinates, awesomeCepData, query)
          } else {
            const cepData = await fetchCepAddress(query)
            place = await geocodeQueries(buildCepSearchQueries(cepData, query), { cep: query })
          }
        }
      } else {
        place = await geocodeQueries([query])
      }

      if (!place) {
        setStatusMessage(isBrazilianCep(query)
          ? "CEP encontrado, mas sem coordenada exata no mapa. Tente rua, bairro, cidade/UF ou o nome da fazenda."
          : "Endereço não encontrado. Tente cidade, UF, CEP ou nome da fazenda."
        )
        return
      }

      const lat = Number(place.lat)
      const lng = Number(place.lon)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      if (searchMarkerRef.current) searchMarkerRef.current.remove()

      searchMarkerRef.current = L.marker([lat, lng]).addTo(mapRef.current)
      searchMarkerRef.current.bindPopup(place.display_name).openPopup()
      mapRef.current.setView([lat, lng], 17)
      setStatusMessage("Local encontrado. Agora contorne a borda real da fazenda.")
    } catch {
      setStatusMessage("Erro ao buscar endereço. Verifique a conexão e tente novamente.")
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="farm-map-shell">
      <section className="farm-map-header">
        <div>
          <span className="farm-map-kicker">Serviços / Mapa</span>
          <h2>Demarcação da fazenda</h2>
          <p>
            Localize a propriedade, desenhe o perímetro real e ajuste os vértices sobre a imagem de satélite.
          </p>
        </div>

        <div className="farm-map-summary">
          <div className="farm-map-summary-item">
            <span className="material-symbols-outlined">polyline</span>
            <strong>{areas.length}</strong>
            <small>áreas</small>
          </div>
          <div className="farm-map-summary-item">
            <span className="material-symbols-outlined">straighten</span>
            <strong>{formatArea(totalArea)}</strong>
            <small>total</small>
          </div>
          <div className="farm-map-summary-item">
            <span className="material-symbols-outlined">ads_click</span>
            <strong>{selectedArea ? formatArea(selectedArea.areaHa) : "--"}</strong>
            <small>selecionada</small>
          </div>
        </div>
      </section>

      <section className="farm-map-workspace">
        <aside className="farm-map-panel">
          <form className="farm-map-search" onSubmit={handleCepAwareSearch}>
            <label htmlFor="farm-map-search">Localizar fazenda</label>
            <div>
              <input
                id="farm-map-search"
                type="text"
                placeholder="Nome, CEP, cidade ou endereço"
                value={searchAddress}
                onChange={(event) => setSearchAddress(event.target.value)}
              />
              <button type="submit" disabled={searching}>
                <span className="material-symbols-outlined">search</span>
                {searching ? "Buscando" : "Buscar"}
              </button>
            </div>
          </form>

          <div className="farm-map-actions">
            {activeMode === "editing" ? (
              <>
                <button className="farm-map-button primary" type="button" onClick={saveEditing}>
                  <span className="material-symbols-outlined">done</span>
                  Salvar bordas
                </button>
                <button className="farm-map-button muted" type="button" onClick={() => stopActiveTool({ revertEdit: true })}>
                  <span className="material-symbols-outlined">close</span>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button className="farm-map-button primary" type="button" onClick={startDrawing}>
                  <span className="material-symbols-outlined">draw</span>
                  Nova área
                </button>
                <button className="farm-map-button secondary" type="button" onClick={startEditing}>
                  <span className="material-symbols-outlined">edit_location_alt</span>
                  Ajustar bordas
                </button>
              </>
            )}

            <button className="farm-map-button muted" type="button" onClick={focusMap} disabled={areas.length === 0}>
              <span className="material-symbols-outlined">center_focus_strong</span>
              Focar
            </button>
            <button className="farm-map-button muted" type="button" onClick={locateUser}>
              <span className="material-symbols-outlined">my_location</span>
              Minha posição
            </button>
          </div>

          <div className="farm-map-selected">
            <div className="farm-map-section-title">
              <span className="material-symbols-outlined">location_on</span>
              Área selecionada
            </div>

            {selectedArea ? (
              <div className="farm-map-selected-card">
                <span style={{ backgroundColor: selectedArea.color }} />
                <div>
                  {isRenamingArea ? (
                    <form className="farm-map-name-row" onSubmit={handleAreaNameSubmit}>
                      <input
                        key={selectedArea.id}
                        ref={areaNameInputRef}
                        className="farm-map-name-input"
                        name="areaName"
                        type="text"
                        defaultValue={selectedArea.name}
                        maxLength={42}
                        aria-label="Nome da área"
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setAreaNameDraft(selectedArea.name)
                            setIsRenamingArea(false)
                          }
                        }}
                      />
                      <button
                        className="farm-map-name-save"
                        type="submit"
                        aria-label="Salvar nome da área"
                        title="Salvar nome da área"
                      >
                        <span className="material-symbols-outlined">check</span>
                      </button>
                    </form>
                  ) : (
                    <div className="farm-map-name-view">
                      <div>
                        <strong>{selectedArea.name}</strong>
                        <small>{formatArea(selectedArea.areaHa)}</small>
                      </div>
                      <button
                        className="farm-map-name-edit"
                        type="button"
                        onClick={() => setIsRenamingArea(true)}
                        title="Editar nome da área"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="farm-map-delete-selected"
                  type="button"
                  onClick={deleteSelectedArea}
                  title="Excluir área selecionada"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ) : (
              <p className="farm-map-empty">Clique em uma área salva para selecionar.</p>
            )}
          </div>

          <div className="farm-map-area-list">
            <div className="farm-map-section-title">
              <span className="material-symbols-outlined">format_list_bulleted</span>
              Áreas salvas
            </div>

            {areas.length > 0 ? (
              <div className="farm-map-area-items">
                {areas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    className={`farm-map-area-item ${selectedAreaId === area.id ? "active" : ""}`}
                    onClick={() => setSelectedAreaId(selectedAreaId === area.id ? null : area.id)}
                  >
                    <span className="farm-map-area-color" style={{ backgroundColor: area.color }} />
                    <span>
                      <strong>{area.name}</strong>
                      <small>{formatArea(area.areaHa)}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="farm-map-empty">Nenhuma borda demarcada ainda.</p>
            )}

            <button className="farm-map-clear" type="button" onClick={clearAllAreas} disabled={areas.length === 0}>
              Limpar todas
            </button>
          </div>
        </aside>

        <section className="farm-map-canvas-card">
          <div className={`farm-map-status ${activeMode}`}>
            <span className="material-symbols-outlined">
              {activeMode === "drawing" ? "gesture" : activeMode === "editing" ? "edit" : "satellite_alt"}
            </span>
            <span>{statusMessage}</span>
          </div>
          <div ref={mapContainerRef} className="farm-map-canvas" />
        </section>
      </section>

      {deleteDialog && (
        <div className="farm-map-dialog-backdrop" role="presentation">
          <div
            className="farm-map-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="farm-map-dialog-title"
          >
            <div className="farm-map-dialog-icon">
              <span className="material-symbols-outlined">delete</span>
            </div>
            <div>
              <h3 id="farm-map-dialog-title">Você tem certeza que quer excluir?</h3>
              <p>
                {deleteDialog.type === "single"
                  ? `A área "${deleteDialog.area.name}" será removida do mapa.`
                  : "Todas as áreas demarcadas serão removidas do mapa."}
              </p>
            </div>
            <div className="farm-map-dialog-actions">
              <button type="button" className="farm-map-dialog-cancel" onClick={() => setDeleteDialog(null)}>
                Cancelar
              </button>
              <button type="button" className="farm-map-dialog-confirm" onClick={confirmDeleteDialog}>
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

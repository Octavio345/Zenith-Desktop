import { useCallback, useEffect, useRef, useState } from "react"
import { analyzeCanaImage, validateCanaImage } from "../../../../services/canaAnalysisService"

export function useCanaAnalysis() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState("idle")
  const previewUrlRef = useRef(null)
  const resultAssetUrlsRef = useRef([])
  const controllerRef = useRef(null)

  const revokeResultAssets = useCallback(() => {
    resultAssetUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    resultAssetUrlsRef.current = []
  }, [])

  useEffect(() => () => {
    controllerRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    revokeResultAssets()
  }, [revokeResultAssets])

  const analyze = useCallback(async (file) => {
    if (!file) return
    const validationError = validateCanaImage(file)
    if (validationError) {
      setError(validationError)
      return
    }

    controllerRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    revokeResultAssets()

    const previewUrl = URL.createObjectURL(file)
    const controller = new AbortController()
    previewUrlRef.current = previewUrl
    controllerRef.current = controller
    setPreview(previewUrl)
    setResult(null)
    setError(null)
    setLoading(true)
    setStatus("connecting")

    try {
      const data = await analyzeCanaImage(file, {
        signal: controller.signal,
        onStatus: setStatus,
        mode: "aerial",
      })

      const cacheResultAsset = async (remoteUrl) => {
        if (!remoteUrl) return null
        try {
          const response = await fetch(remoteUrl, { signal: controller.signal })
          if (!response.ok) return remoteUrl
          const localUrl = URL.createObjectURL(await response.blob())
          resultAssetUrlsRef.current.push(localUrl)
          return localUrl
        } catch (downloadError) {
          if (controller.signal.aborted) throw downloadError
          return remoteUrl
        }
      }

      const [analysisSrc, mask, rows, intersections] = await Promise.all([
        cacheResultAsset(data.analysisUrl),
        cacheResultAsset(data.pipelineStages?.mask),
        cacheResultAsset(data.pipelineStages?.rows),
        cacheResultAsset(data.pipelineStages?.intersections),
      ])
      data.analysisSrc = analysisSrc
      data.pipelineStages = { mask, rows, intersections }
      setResult(data)
      setStatus("complete")
    } catch (analysisError) {
      if (!controller.signal.aborted) {
        setError(analysisError.message || "Erro desconhecido ao analisar a imagem.")
        setStatus("error")
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setLoading(false)
      }
    }
  }, [revokeResultAssets])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    revokeResultAssets()
    previewUrlRef.current = null
    setResult(null)
    setError(null)
    setPreview(null)
    setLoading(false)
    setStatus("idle")
  }, [revokeResultAssets])

  return { analyze, reset, result, loading, error, preview, status }
}

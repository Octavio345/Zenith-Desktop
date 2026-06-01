import { useCallback, useEffect, useRef, useState } from "react"
import { analisarImagem, validarArquivo } from "../../../../services/monitoramentoService"

export function useMonitoramento() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const previewUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const analisar = useCallback(async (file) => {
    if (!file) return

    const erroValidacao = validarArquivo(file)
    if (erroValidacao) {
      setError(erroValidacao)
      return
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    const novaPreview = URL.createObjectURL(file)
    previewUrlRef.current = novaPreview

    setPreview(novaPreview)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const data = await analisarImagem(file)
      setResult(data)
    } catch (err) {
      setError(err.message || "Erro desconhecido ao analisar imagem.")
    } finally {
      setLoading(false)
    }
  }, [])

  const resetar = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setResult(null)
    setError(null)
    setPreview(null)
    setLoading(false)
  }, [])

  return { analisar, resetar, result, loading, error, preview }
}

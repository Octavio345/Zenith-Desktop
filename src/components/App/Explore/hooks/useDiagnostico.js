import { useState } from "react"

export function useDiagnostico() {
  const [diagnosisResult, setDiagnosisResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [history, setHistory] = useState([
    {
      id: 1,
      disease: "Ferrugem Asiática",
      date: "12/03/2024",
      confidence: 94,
      severity: "Média"
    },
    {
      id: 2,
      disease: "Pinta Preta",
      date: "10/03/2024",
      confidence: 87,
      severity: "Baixa"
    }
  ])

  const analyzeImage = async () => {
    setIsAnalyzing(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const result = {
      disease: "Ferrugem Asiática",
      confidence: 94,
      treatment: "Aplicar fungicida à base de triazol (0.5L/ha). Repetir em 14 dias.",
      severity: "Média",
      prevention: "Rotação de culturas e uso de cultivares resistentes"
    }
    
    setDiagnosisResult(result)
    
    setHistory(prev => [{
      id: Date.now(),
      disease: result.disease,
      date: new Date().toLocaleDateString('pt-BR'),
      confidence: result.confidence,
      severity: result.severity
    }, ...prev])
    
    setIsAnalyzing(false)
    return result
  }

  const resetDiagnosis = () => {
    setDiagnosisResult(null)
  }

  return {
    diagnosisResult,
    isAnalyzing,
    history,
    analyzeImage,
    resetDiagnosis
  }
}
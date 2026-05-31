import { useState, useRef, useEffect } from "react"

export function useCamera() {
  const [stream, setStream] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [facingMode, setFacingMode] = useState("environment")
  const videoRef = useRef(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      })
      
      setStream(mediaStream)
      setIsCameraActive(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error("Erro na câmera:", err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsCameraActive(false)
    }
  }

  const switchCamera = () => {
    stopCamera()
    setFacingMode(prev => prev === "environment" ? "user" : "environment")
  }

  const capturePhoto = () => {
    if (!videoRef.current) return null

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    
    const ctx = canvas.getContext("2d")
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    
    const imageData = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(imageData)
    
    return imageData
  }

  const resetCapture = () => {
    setCapturedImage(null)
  }

  useEffect(() => {
    if (isCameraActive) {
      startCamera()
    }
    return () => stopCamera()
  }, [facingMode])

  return {
    videoRef,
    isCameraActive,
    capturedImage,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    resetCapture
  }
}
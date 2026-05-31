import { useState } from "react"

export function useGallery() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [error, setError] = useState(null)

  const pickFromGallery = () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*"
      
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            setError("Imagem muito grande")
            reject("File too large")
            return
          }

          const reader = new FileReader()
          reader.onload = (event) => {
            setSelectedImage(event.target.result)
            resolve(event.target.result)
          }
          reader.readAsDataURL(file)
        }
      }
      
      input.click()
    })
  }

  const resetSelection = () => {
    setSelectedImage(null)
    setError(null)
  }

  return {
    selectedImage,
    error,
    pickFromGallery,
    resetSelection
  }
}
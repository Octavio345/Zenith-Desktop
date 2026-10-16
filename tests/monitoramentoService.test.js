import test from "node:test"
import assert from "node:assert/strict"
import { arquivoEhAvif, resultadoConclusivo, validarArquivo } from "../src/services/monitoramentoService.js"

test("upload respeita o limite de 30 MB da API", () => {
  const image = { type: "image/jpeg", size: 30 * 1024 * 1024 }
  assert.equal(validarArquivo(image), null)
  assert.match(validarArquivo({ ...image, size: image.size + 1 }), /30 MB/)
})

test("detecta AVIF mesmo quando o arquivo é rotulado como JPEG", async () => {
  const avif = new Blob([
    Uint8Array.from([0, 0, 0, 28]),
    "ftypavif",
    Uint8Array.from([0, 0, 0, 0]),
    "mif1avif",
  ], { type: "image/jpeg" })
  const jpeg = new Blob([Uint8Array.from([255, 216, 255, 224])], { type: "image/jpeg" })

  assert.equal(await arquivoEhAvif(avif), true)
  assert.equal(await arquivoEhAvif(jpeg), false)
  assert.equal(validarArquivo({ type: "image/avif", size: 1024 }), null)
})

test("resultados parciais e imagens inadequadas não são conclusivos", () => {
  assert.equal(resultadoConclusivo({ analysis_status: "complete", is_plantation: true, processing_warnings: [] }), true)
  assert.equal(resultadoConclusivo({ analysis_status: "inconclusive", is_plantation: false }), false)
  assert.equal(resultadoConclusivo({ analysis_status: "partial", is_plantation: true }), false)
  assert.equal(resultadoConclusivo({ is_plantation: true, processing_warnings: ["row_detection"] }), false)
})

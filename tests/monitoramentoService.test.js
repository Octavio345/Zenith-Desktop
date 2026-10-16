import test from "node:test"
import assert from "node:assert/strict"
import { resultadoConclusivo, validarArquivo } from "../src/services/monitoramentoService.js"

test("upload respeita o limite de 30 MB da API", () => {
  const image = { type: "image/jpeg", size: 30 * 1024 * 1024 }
  assert.equal(validarArquivo(image), null)
  assert.match(validarArquivo({ ...image, size: image.size + 1 }), /30 MB/)
})

test("resultados parciais e imagens inadequadas não são conclusivos", () => {
  assert.equal(resultadoConclusivo({ analysis_status: "complete", is_plantation: true, processing_warnings: [] }), true)
  assert.equal(resultadoConclusivo({ analysis_status: "inconclusive", is_plantation: false }), false)
  assert.equal(resultadoConclusivo({ analysis_status: "partial", is_plantation: true }), false)
  assert.equal(resultadoConclusivo({ is_plantation: true, processing_warnings: ["row_detection"] }), false)
})

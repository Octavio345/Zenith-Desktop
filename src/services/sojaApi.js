export async function diagnosticarSoja(file) {

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    "https://tccamsamericana-api-doencas-soja.hf.space/predict",
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error("Erro na API");
  }

  return await response.json();
}

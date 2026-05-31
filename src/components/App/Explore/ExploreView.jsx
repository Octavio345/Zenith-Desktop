import { useState, useEffect } from "react";
import ExploreTabs from "./ExploreTabs";
import DiagnosticoTab from "./DiagnosticoTab";
import ClimaTab from "./ClimaTab";
import DiarioTab from "./DiarioTab";
import MapaTab from "./MapaTab";
import EstoqueTab from "./EstoqueTab";
import { useFarmData } from "../../hooks/useFarmData";
import { useCamera } from "../../hooks/useCamera";
import { useDiagnostico } from "../../hooks/useDiagnostico";
import { useGallery } from "../../hooks/useGallery";
import "../../../styles/App/Explore.css";

// Dados mockados para teste caso os hooks falhem
const MOCK_CAMERA = {
  videoRef: { current: null },
  isCameraActive: false,
  capturedImage: null,
  facingMode: "environment",
  startCamera: () => console.log("Mock startCamera"),
  stopCamera: () => console.log("Mock stopCamera"),
  switchCamera: () => console.log("Mock switchCamera"),
  capturePhoto: () => {
    console.log("Mock capturePhoto");
    return "data:image/jpeg;base64,mock";
  },
  resetCapture: () => console.log("Mock resetCapture")
};

const MOCK_DIAGNOSTICO = {
  diagnosisResult: null,
  isAnalyzing: false,
  history: [
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
  ],
  analyzeImage: async () => {
    console.log("Mock analyzeImage");
    return { disease: "Mock", confidence: 100 };
  },
  resetDiagnosis: () => console.log("Mock resetDiagnosis")
};

const MOCK_GALLERY = {
  selectedImage: null,
  error: null,
  pickFromGallery: async () => {
    console.log("Mock pickFromGallery");
    return "data:image/jpeg;base64,mock";
  },
  resetSelection: () => console.log("Mock resetSelection")
};

export default function ExploreView() {
  const [activeTab, setActiveTab] = useState("clima");
  const [hooks, setHooks] = useState({
    camera: null,
    diagnostico: null,
    gallery: null,
    farmData: null
  });
  const [loading, setLoading] = useState(true);

  // Inicializa todos os hooks com segurança
  useEffect(() => {
    console.log("📦 Inicializando hooks...");
    
    try {
      // Tenta usar os hooks reais
      const farmHook = useFarmData();
      const cameraHook = useCamera();
      const diagnosticoHook = useDiagnostico();
      const galleryHook = useGallery();

      console.log("✅ Hooks reais inicializados:", {
        farmHook: !!farmHook,
        cameraHook: !!cameraHook,
        diagnosticoHook: !!diagnosticoHook,
        galleryHook: !!galleryHook
      });

      setHooks({
        farmData: farmHook,
        camera: cameraHook,
        diagnostico: diagnosticoHook,
        gallery: galleryHook
      });
    } catch (error) {
      console.error("❌ Erro ao inicializar hooks reais, usando mock:", error);
      // Se falhar, usa os mocks
      setHooks({
        farmData: { farmData: null, loading: false, error: null },
        camera: MOCK_CAMERA,
        diagnostico: MOCK_DIAGNOSTICO,
        gallery: MOCK_GALLERY
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Log para debug
  useEffect(() => {
    if (!loading) {
      console.log("📊 Estado dos hooks:", {
        camera: !!hooks.camera,
        diagnostico: !!hooks.diagnostico,
        diagnosticoHistory: hooks.diagnostico?.history?.length || 0,
        gallery: !!hooks.gallery
      });
    }
  }, [loading, hooks]);

  if (loading) {
    return (
      <div className="explore-container">
        <div className="clima-tab-loading">
          <div className="clima-tab-loading-spinner"></div>
          <p>Inicializando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-container">
      <ExploreTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="tab-content">
        {activeTab === "clima" && (
          <ClimaTab farmData={hooks.farmData?.farmData || null} />
        )}
        
        {activeTab === "diagnostico" && (
          <DiagnosticoTab 
            camera={hooks.camera}
            diagnostico={hooks.diagnostico}
            gallery={hooks.gallery}
          />
        )}
        
        {activeTab === "diario" && (
          <DiarioTab />
        )}
        
        {activeTab === "mapa" && (
          <MapaTab />
        )}
        
        {activeTab === "estoque" && (
          <EstoqueTab />
        )}
      </div>
    </div>
  );
}
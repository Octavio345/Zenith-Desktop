import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CustomSelect from "../Global/CustomSelect"
import "../../../styles/App/EstoqueTab.css"

export default function EstoqueTab() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("todos")
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "insumo",
    quantity: "",
    unit: "unidade",
    minQuantity: "",
    price: "",
    supplier: "",
    expiryDate: ""
  })

  // Categorias disponíveis
  const categories = [
    { id: "insumo", name: "Insumos", icon: "inventory" },
    { id: "fertilizante", name: "Fertilizantes", icon: "grass" },
    { id: "defensivo", name: "Defensivos", icon: "bug_report" },
    { id: "semente", name: "Sementes", icon: "psychiatry" },
    { id: "equipamento", name: "Equipamentos", icon: "handyman" }
  ]

  const categoryOptions = categories.map(cat => ({ value: cat.id, label: cat.name }))
  const unitOptions = [
    { value: "unidade", label: "Unidade" },
    { value: "kg", label: "Kg" },
    { value: "litros", label: "Litros" },
    { value: "sacos", label: "Sacos" },
    { value: "caixas", label: "Caixas" }
  ]

  // Carregar estoque do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("inventory")
    if (saved) {
      setProducts(JSON.parse(saved))
    } else {
      // Dados de exemplo
      const sampleProducts = [
        {
          id: 1,
          name: "Fungicida Premium",
          category: "defensivo",
          quantity: 150,
          unit: "litros",
          minQuantity: 50,
          price: 89.90,
          supplier: "AgroTech",
          expiryDate: "2025-12-31",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Fertilizante NPK 10-10-10",
          category: "fertilizante",
          quantity: 500,
          unit: "kg",
          minQuantity: 200,
          price: 45.50,
          supplier: "NutriAgro",
          expiryDate: "2026-06-30",
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Semente de Soja",
          category: "semente",
          quantity: 1000,
          unit: "kg",
          minQuantity: 300,
          price: 120.00,
          supplier: "Sementes Brasil",
          expiryDate: "2025-08-15",
          createdAt: new Date().toISOString()
        }
      ]
      setProducts(sampleProducts)
      localStorage.setItem("inventory", JSON.stringify(sampleProducts))
    }
  }, [])

  // Salvar produtos
  const saveProducts = (newProducts) => {
    setProducts(newProducts)
    localStorage.setItem("inventory", JSON.stringify(newProducts))
  }

  // Adicionar produto
  const addProduct = () => {
    if (!newProduct.name.trim()) return

    const product = {
      id: Date.now(),
      ...newProduct,
      quantity: parseFloat(newProduct.quantity) || 0,
      minQuantity: parseFloat(newProduct.minQuantity) || 0,
      price: parseFloat(newProduct.price) || 0,
      createdAt: new Date().toISOString()
    }

    saveProducts([...products, product])
    setNewProduct({
      name: "",
      category: "insumo",
      quantity: "",
      unit: "unidade",
      minQuantity: "",
      price: "",
      supplier: "",
      expiryDate: ""
    })
    setShowForm(false)
  }

  // Atualizar produto
  const updateProduct = () => {
    if (!selectedProduct) return

    const updatedProducts = products.map(p => 
      p.id === selectedProduct.id ? { ...selectedProduct } : p
    )
    saveProducts(updatedProducts)
    setSelectedProduct(null)
  }

  // Deletar produto
  const deleteProduct = (id) => {
    saveProducts(products.filter(p => p.id !== id))
    setDeleteTarget(null)
  }

  // Atualizar quantidade
  const updateQuantity = (id, newQuantity) => {
    const updatedProducts = products.map(p => {
      if (p.id === id) {
        return { ...p, quantity: Math.max(0, parseFloat(newQuantity) || 0) }
      }
      return p
    })
    saveProducts(updatedProducts)
  }

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "todos" || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Estatísticas
  const totalProducts = products.length
  const lowStock = products.filter(p => p.quantity <= p.minQuantity).length
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)

  // Obter ícone da categoria
  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category)
    return cat?.icon || "inventory"
  }

  // Obter nome da categoria
  const getCategoryName = (category) => {
    const cat = categories.find(c => c.id === category)
    return cat?.name || category
  }

  // Verificar se está em falta
  const isLowStock = (product) => {
    return product.quantity <= product.minQuantity
  }

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return "Não definida"
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR")
  }

  // Verificar se está perto do vencimento
  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false
    const expiry = new Date(dateStr)
    const today = new Date()
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  return (
    <div className="estoque-container">
      {/* Header */}
      <div className="estoque-header">
        <div>
          <h2>Estoque</h2>
          <p>Gerencie insumos, defensivos, sementes e equipamentos.</p>
        </div>
        <button className="add-product-btn" onClick={() => setShowForm(true)}>
          <span className="material-symbols-outlined">add</span>
          Novo produto
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="estoque-controls">
        <div className="search-bar">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <button
            className={`filter-chip ${filterCategory === "todos" ? "active" : ""}`}
            onClick={() => setFilterCategory("todos")}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`filter-chip ${filterCategory === cat.id ? "active" : ""}`}
              onClick={() => setFilterCategory(cat.id)}
            >
              <span className="material-symbols-outlined">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="estoque-stats">
        <div className="stat-card">
          <span className="material-symbols-outlined">inventory</span>
          <div>
            <strong>{totalProducts}</strong>
            <p>Produtos</p>
          </div>
        </div>
        <div className="stat-card warning">
          <span className="material-symbols-outlined">warning</span>
          <div>
            <strong>{lowStock}</strong>
            <p>Estoque baixo</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-symbols-outlined">payments</span>
          <div>
            <strong>R$ {totalValue.toLocaleString("pt-BR")}</strong>
            <p>Valor total</p>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="products-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">inventory</span>
            <p>Nenhum produto encontrado</p>
            <button onClick={() => setShowForm(true)}>Adicionar produto</button>
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className={`product-card ${isLowStock(product) ? "low-stock" : ""}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="product-header">
                <div className="product-icon">
                  <span className="material-symbols-outlined">{getCategoryIcon(product.category)}</span>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <span className="product-category">{getCategoryName(product.category)}</span>
                </div>
                <button
                  className="product-actions"
                  onClick={() => setSelectedProduct(product)}
                >
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="product-details">
                <div className="quantity-section">
                  <div className="quantity-display">
                    <span className="quantity-value">{product.quantity}</span>
                    <span className="quantity-unit">{product.unit}</span>
                  </div>
                  <div className="quantity-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(product.id, product.quantity - 10)}
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(product.id, product.quantity + 10)}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                {product.minQuantity > 0 && (
                  <div className="stock-indicator">
                    <div className="stock-bar">
                      <div
                        className="stock-fill"
                        style={{
                          width: `${Math.min(100, (product.quantity / product.minQuantity) * 100)}%`,
                          background: isLowStock(product) ? "#ffaa00" : "#00ffaa"
                        }}
                      ></div>
                    </div>
                    <span className="stock-text">
                      Mínimo: {product.minQuantity} {product.unit}
                    </span>
                  </div>
                )}

                {product.price > 0 && (
                  <div className="product-price">
                    <span className="price-label">Preço unitário:</span>
                    <span className="price-value">R$ {product.price.toFixed(2)}</span>
                  </div>
                )}

                {product.supplier && (
                  <div className="product-supplier">
                    <span className="material-symbols-outlined">local_shipping</span>
                    <span>{product.supplier}</span>
                  </div>
                )}

                {product.expiryDate && (
                  <div className={`product-expiry ${isExpiringSoon(product.expiryDate) ? "expiring-soon" : ""}`}>
                    <span className="material-symbols-outlined">event</span>
                    <span>Vence: {formatDate(product.expiryDate)}</span>
                  </div>
                )}
              </div>

              <button
                className="delete-product"
                onClick={() => setDeleteTarget(product)}
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Novo Produto */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="estoque-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="product-form"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Novo Produto</h3>
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Nome do produto</label>
                <input
                  type="text"
                  placeholder="Ex: Fungicida Premium"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <CustomSelect
                  value={newProduct.category}
                  onChange={(category) => setNewProduct({ ...newProduct, category })}
                  options={categoryOptions}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <CustomSelect
                    value={newProduct.unit}
                    onChange={(unit) => setNewProduct({ ...newProduct, unit })}
                    options={unitOptions}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade mínima</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProduct.minQuantity}
                    onChange={(e) => setNewProduct({...newProduct, minQuantity: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Preço unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fornecedor</label>
                <input
                  type="text"
                  placeholder="Nome do fornecedor"
                  value={newProduct.supplier}
                  onChange={(e) => setNewProduct({...newProduct, supplier: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Data de validade</label>
                <input
                  type="date"
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                />
              </div>

              <button className="submit-btn" onClick={addProduct}>
                Adicionar produto
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Produto */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            className="estoque-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              className="product-form"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Editar Produto</h3>
                <button className="close-btn" onClick={() => setSelectedProduct(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="form-group">
                <label>Nome do produto</label>
                <input
                  type="text"
                  value={selectedProduct.name}
                  onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <CustomSelect
                  value={selectedProduct.category}
                  onChange={(category) => setSelectedProduct({ ...selectedProduct, category })}
                  options={categoryOptions}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedProduct.quantity}
                    onChange={(e) => setSelectedProduct({...selectedProduct, quantity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <CustomSelect
                    value={selectedProduct.unit}
                    onChange={(unit) => setSelectedProduct({ ...selectedProduct, unit })}
                    options={unitOptions}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade mínima</label>
                  <input
                    type="number"
                    value={selectedProduct.minQuantity}
                    onChange={(e) => setSelectedProduct({...selectedProduct, minQuantity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Preço unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedProduct.price}
                    onChange={(e) => setSelectedProduct({...selectedProduct, price: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fornecedor</label>
                <input
                  type="text"
                  value={selectedProduct.supplier || ""}
                  onChange={(e) => setSelectedProduct({...selectedProduct, supplier: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Data de validade</label>
                <input
                  type="date"
                  value={selectedProduct.expiryDate || ""}
                  onChange={(e) => setSelectedProduct({...selectedProduct, expiryDate: e.target.value})}
                />
              </div>

              <button className="submit-btn" onClick={updateProduct}>
                Salvar alterações
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="estoque-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="product-form"
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="form-header">
                <h3>Excluir produto?</h3>
                <button className="close-btn" onClick={() => setDeleteTarget(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p style={{ color: "#9aaca8", margin: "0 0 20px", lineHeight: 1.5 }}>
                Você tem certeza que quer remover <strong style={{ color: "#fff" }}>{deleteTarget.name}</strong> do estoque?
              </p>
              <div className="form-row">
                <button className="submit-btn" style={{ background: "rgba(255,255,255,0.08)" }} onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </button>
                <button className="submit-btn" style={{ background: "rgba(255,68,68,0.18)", color: "#ff6b6b" }} onClick={() => deleteProduct(deleteTarget.id)}>
                  Excluir produto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

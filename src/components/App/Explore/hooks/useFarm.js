import { useEffect, useState } from "react"
import { auth, db } from "../../../../services/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export function useFarm() {
  const [farmData, setFarmData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFarm = async () => {
      const user = auth.currentUser

      if (!user) {
        setLoading(false)
        return
      }

      try {
        const q = query(
          collection(db, "farms"),
          where("ownerId", "==", user.uid)
        )

        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const farm = snapshot.docs[0].data()
          setFarmData(farm)
        }
      } catch (error) {
        console.error("Erro ao buscar fazenda:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFarm()
  }, [])

  return { farmData, loading }
}
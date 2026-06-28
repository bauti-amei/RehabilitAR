import { useEffect, useState } from "react";
import Spinner from "../../components/common/Spinner";
import "./RegisterPaymentModal.css";
import ReservationItem from "./ReservationItem";

export default function RegisterPaymentModal({ usuario, onClose }) {
  const [clases,setClases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPendientes = () => {
    if(!usuario) return;

    const token = localStorage.getItem("access_token");

    if (!token) {
        console.error("No hay sesión activa");
        return;
    }

    setLoading(true);
    setError('');
    fetch(`/api/clases/clases-pendientes-pago/?usuario_id=${usuario.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
    .then((res) => {
      if(!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then(data => setClases(data))
    .catch(e => setError(e))
    .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPendientes();
  },[usuario])

  return(
    <>
      {usuario && 
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <h3 className="modal-title">Registrar pago presencial</h3>
              <button className="modal-close-btn" onClick={onClose}>✕</button>
            </div>
            <div>
              {loading && <Spinner />}
              {!loading && error && <p className="error-msg">Hubo un error al buscar las clases del usuario.</p>}
              {!loading && !error && clases.length === 0 &&
                <p className="empty-msg">No se encontraron reservas pendientes de pago para el usuario.</p>
              }
              {!loading && !error && clases.length > 0 && clases.map(c => 
                <ReservationItem reservation={c} onSuccess={fetchPendientes}/>
              )}
            </div>
          </div>
        </div>
      }
    </>
  );
}
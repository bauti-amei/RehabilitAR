import { useState } from "react";
import "./ReservationItem.css";
import toast from 'react-hot-toast';

const formatPrice = (valor) => {
  if (valor == null) return "$ 0,00";
  return "$ " + Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function ReservationItem({ reservation, onSuccess}) {
  const [loading, setLoading] = useState(false);

  const isSuscription = reservation.tipo === "suscripcion";

  const handleRegisterPayment = () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    const { usuario_id, fecha, mes, anio } = reservation;

    const body = { 
      usuario_id,   
      clase_id: reservation.clase.id, 
      ...(isSuscription ? {
        mes,
        anio,
        type:"suscripcion"
      } : {
        fecha,
        type:"reserva"
      })
    };

    const promise = fetch(`/api/clases/clases-pendientes-pago/`, {
      method: "POST",
      body:JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
    .then((res) => {
      if(!res.ok) throw new Error(res.statusText)
    })
    .then(data => onSuccess())
    .finally(() => setLoading(false));

    toast.promise(promise, {
      loading:"Registrando pago...",
      error:"Hubo un error al registrar el pago",
      success:"Pago registrado exitosamente"
    }, {
      position:"bottom-center",
      style: {
        fontSize:18
      }
    })
  }

  console.log(reservation)

  const type = isSuscription ? "Suscripción" : "Reserva";

  const date = isSuscription 
  ? `${String(reservation.mes).padStart(2, '0')}-${reservation.anio}` 
  : reservation.fecha.split('-').reverse().join('-');

  const monto_restante = Number(isSuscription 
    ? reservation.monto
    : reservation.monto_total
  ) - Number(reservation.monto_pagado);

  return (
    <div className="reservation-item-container">
      <div className="reservation-item-header">
        <h3 className="reservation-item-title">{type} en: {reservation.clase.nombre}</h3>
        <label className={`reservation-item-type ${reservation.tipo}`}>{type}</label>
      </div>
      <div className="reservation-item-content">
        <p className="reservation-item-data"><strong>Fecha:</strong> {date}</p>
        <p className="reservation-item-data">
          <strong>Monto restante:</strong> {formatPrice(monto_restante)}
        </p>
        <button 
          className="reservation-item-btn"
          onClick={handleRegisterPayment}
          disabled={loading}
        >
          Registrar pago
        </button>
      </div>
    </div>
  );
}
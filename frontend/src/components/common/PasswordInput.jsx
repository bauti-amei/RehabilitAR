import { useState } from "react"
import { FaRegEye ,FaRegEyeSlash } from "react-icons/fa";

export default function PasswordInput({
    name="password", 
    value=undefined, 
    onChange=undefined, 
    placeholder="Contraseña...",
    className=undefined
}) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        type={show ? "text" : "password"}
        style={{width:"100%"}}
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        style={{
          position: "absolute",
          right: "5%",
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color:"#1a9d85",
        }}
      >
        {show ? <FaRegEyeSlash size={22} /> : <FaRegEye size={20} /> }
      </button>
    </div>
  )
}
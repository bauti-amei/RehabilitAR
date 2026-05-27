import { useState } from "react";
import "./ChangePassword.css";
import toast from 'react-hot-toast'
import PasswordInput from "../../components/common/PasswordInput";
import { useNavigate } from "react-router-dom";

const TOAST_OPTIONS = {
    position:"bottom-center",
    style: {
        fontSize:"18px",
    }
}

export default function ChangePassword() {
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const oldPass = formData.get("oldPass");
        const newPass = formData.get("newPass");

        const token = localStorage.getItem("access_token");

        if (!token) {
            console.error("No hay sesión activa");
            return;
        }

        const hasLetter = /[a-zA-Z]/.test(newPass);
        const hasNumber = /\d/.test(newPass);

        if(!oldPass || !newPass) return;

        const newErrors = {}

        if((newPass.length < 8)||(!hasLetter)||(!hasNumber)) {
            newErrors.new = "La contraseña debe incluir al menos 8 caracteres, una letra y un número";
        }

        if(!newErrors.new) {
            const res = await fetch("/api/auth/change-pass/", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ oldPass, newPass }),
            });

            const data = await res.json();

            if(res.ok) {
                toast.success(data.detail, TOAST_OPTIONS);
                navigate('/');
            }
            else {
                if(data.detail === "La contraseña actual es incorrecta."){
                    newErrors.old = data.detail;
                }
                else 
                    toast.error(data.detail || "Error al cambiar la contraseña",TOAST_OPTIONS);
            }
        }

        setErrors(newErrors);
    }

    return (
        <div className="change-pass-container">
            <h1>Cambiar contraseña</h1>
            <form className="change-pass-form" onSubmit={handleSubmit}>
                <label>Contraseña actual</label>
                <PasswordInput 
                    name="oldPass"
                    className="change-pass-input"
                    onChange={() => setErrors(prev => ({...prev, old:""}))}
                />
                {errors.old && <p className="changepass-error-message">{errors.old}</p>}

                <label>Nueva contraseña</label>
                <PasswordInput 
                    name="newPass"
                    className="change-pass-input"
                    onChange={() => setErrors(prev => ({...prev, new:""}))}
                />
                {errors.new && <p className="changepass-error-message">{errors.new}</p>}

                <button className="changepass-submit-button" type="submit">Confirmar</button>
            </form>
        </div>
    );
}
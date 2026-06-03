import { ImSpinner2 } from "react-icons/im";
import "./Spinner.css";

export default function Spinner() {
    return(
        <div className="spinner-container">
            <ImSpinner2 className="spinner" />
        </div>
    );
}
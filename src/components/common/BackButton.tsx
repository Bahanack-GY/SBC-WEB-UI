import { MdArrowBack } from "react-icons/md";
function handleBack() {
    window.history.back();
}

function BackButton() {
    return (
        <div >
           <button onClick={handleBack} className="bg-[#94B027] p-2 rounded-xl text-white"><MdArrowBack size={25}/></button>
        </div>
    )
}

export default BackButton;

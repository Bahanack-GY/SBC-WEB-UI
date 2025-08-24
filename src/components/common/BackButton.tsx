import { MdArrowBack } from "react-icons/md";

interface BackButtonProps {
    onClick?: () => void;
}

function BackButton({ onClick }: BackButtonProps) {
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            window.history.back();
        }
    };

    return (
        <div>
            <button 
                onClick={handleClick} 
                className="bg-[#94B027] p-2 rounded-xl text-white"
            >
                <MdArrowBack size={25}/>
            </button>
        </div>
    )
}

export default BackButton;

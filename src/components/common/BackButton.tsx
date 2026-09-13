import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

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
                <HugeiconsIcon icon={ArrowLeft01Icon} size={25} />
            </button>
        </div>
    )
}

export default BackButton;

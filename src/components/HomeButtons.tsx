// import { useNavigate } from 'react-router-dom';

//These buttons are used to navigate to the different features of the app
interface HomeButtonsProps {
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
}

function HomeButtons({ icon, title, onClick }: HomeButtonsProps) {

    return (
        <div className=" py-3 flex flex-col items-center gap-0">
            <button onClick={onClick} className="bg-[#F68F0F] rounded-lg p-4 text-white">
                {icon}
            </button>
            <p className="text-lg font-medium text-gray-800 mt-2">{title}</p>
        </div>
    )
}

export default HomeButtons;

// import { useNavigate } from 'react-router-dom';

//These buttons are used to navigate to the different features of the app
interface HomeButtonsProps {
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
    badge?: string;
}

function HomeButtons({ icon, title, onClick, badge }: HomeButtonsProps) {

    return (
        <div className=" py-3 flex flex-col items-center gap-0">
            <div className="relative">
                <button onClick={onClick} className="bg-[#F68F0F] rounded-lg p-4 text-white">
                    {icon}
                </button>
                {badge && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-lg font-medium text-gray-800 mt-2">{title}</p>
        </div>
    )
}

export default HomeButtons;

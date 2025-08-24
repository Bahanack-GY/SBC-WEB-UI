import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';

function handleOpenUrl(navigate: NavigateFunction, url: string) {
    navigate(url);
}

interface HomeBalanceCardProps {
    balance: number;
    usdBalance: number;
    icon: React.ReactNode;
}
function HomeBalanceCard({ balance, usdBalance, icon }: HomeBalanceCardProps) {
    const navigate = useNavigate();

    return (

        <button onClick={() => handleOpenUrl(navigate, "/wallet")} className="flex justify-between p-3 bg-[#115CF6] rounded-2xl h-36 overflow-hidden w-full">
            <div className="flex flex-col">
                <h2 className="text-white text-lg font-semibold">Vos soldes</h2>
                <div className="flex flex-col gap-1">
                    <p className="text-white text-2xl font-bold">{balance.toFixed(2)} FCFA</p>
                    <p className="text-white text-lg font-semibold">${usdBalance.toFixed(2)} USD</p>
                </div>
                <p className="text-white text-sm">Cliquez ici pour <br /> effectuer un retrait</p>
            </div>
            {icon}


        </button>
    )
}

export default HomeBalanceCard;

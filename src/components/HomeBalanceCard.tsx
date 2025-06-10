import { useNavigate } from 'react-router-dom';

function handleOpenUrl(navigate: any, url: string) {
    navigate(url);
}

interface HomeBalanceCardProps {
    balance: number;
    icon: React.ReactNode;
}
function HomeBalanceCard({ balance, icon }: HomeBalanceCardProps) {
    const navigate = useNavigate();

    return (

        <button onClick={() => handleOpenUrl(navigate, "/wallet")} className="flex justify-between p-3 bg-[#115CF6] rounded-2xl h-32 overflow-hidden w-full">
            <div className="flex flex-col">
                <h2 className="text-white text-lg font-semibold">Votre solde</h2>
                <p className="text-white text-3xl font-bold ">{balance.toFixed(2)} FCFA</p>
                <p className="text-white text-sm">Cliquez ici pour <br /> effectuer un retrait</p>
            </div>
            {icon}


        </button>
    )
}

export default HomeBalanceCard;

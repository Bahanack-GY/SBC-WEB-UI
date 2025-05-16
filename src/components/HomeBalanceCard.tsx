function handleOpenUrl() {
    window.location.href = "/money";
}

interface HomeBalanceCardProps {
    balance: number;
    icon: React.ReactNode;
}
function HomeBalanceCard({balance, icon}: HomeBalanceCardProps) {
    return (
        
        <button onClick={handleOpenUrl} className="flex justify-between p-3 bg-[#115CF6] rounded-2xl h-32 overflow-hidden w-full">
            <div className="flex flex-col">
                <h2 className="text-white text-sm">Votre solde</h2>
                <p className="text-white text-5xl font-bold ">{balance}F</p>
                <p className="text-white text-sm">Cliquez ici pour <br /> effectuer un retrait</p>
            </div>
            {icon}
           
            
        </button>
    )
}   

export default HomeBalanceCard;

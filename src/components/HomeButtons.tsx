//These buttons are used to navigate to the different features of the app
interface HomeButtonsProps {
    icon: React.ReactNode;
    title: string;
    url: string;
}
function handleOpenUrl(url: string) {
    window.location.href = url;
}
function HomeButtons({icon, title, url}: HomeButtonsProps) {
    return (
        <div className=" py-3 flex flex-col items-center gap-0">
            <button onClick={() => handleOpenUrl(url)} className="bg-[#F68F0F] rounded-lg p-4 text-white">
                {icon}
            </button>
            <p className="text-lg font-medium">{title}</p>
        </div>
    )
}

export default HomeButtons;

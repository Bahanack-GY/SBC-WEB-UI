import { FiShare2, FiPhone } from "react-icons/fi";

interface MarketplaceProductCardProps {
    image: string;
    brand: string;
    name: string;
    price: number;
}

function MarketplaceProductCard({image, brand, name, price}: MarketplaceProductCardProps) {
    return (
        <div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow flex flex-col relative min-h-[240px]">
                        {/* Share button */}
                        <button className="absolute top-3 right-3 bg-white rounded-full p-1 shadow text-green-600 hover:bg-green-50 transition-colors">
                            <FiShare2 size={18} />
                        </button>
                        {/* Product image */}
                        <div className="flex justify-center items-center h-24 mb-2">
                            <img src={image} alt={name} className="object-contain h-20" />
                        </div>
                        {/* Brand and name */}
                        <div className="text-xs text-gray-400">{brand}</div>
                        <div className="text-sm font-bold text-gray-800 truncate">{name}</div>
                        {/* Price and phone */}
                        <div className="flex items-center mt-4 gap-2 bg-gray-100 px-3 py-1 rounded-full">
                            <span className=" font-semibold text-gray-700"> {price} F </span>
                            <button className="bg-green-600 rounded-full p-2 text-white hover:bg-green-700 transition-colors ml-auto">
                                <FiPhone size={16} />
                            </button>
                        </div>
                    </div>
        </div>
    )
}

export default MarketplaceProductCard;

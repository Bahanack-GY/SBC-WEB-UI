import { FiShare2, FiPhone } from "react-icons/fi";
import { useState } from 'react';

interface MarketplaceProductCardProps {
    image: string;
    brand: string;
    name: string;
    price: number;
    whatsappLink?: string;
    productId: string;
}

function MarketplaceProductCard({ image, brand, name, price, whatsappLink, productId }: MarketplaceProductCardProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const link = `${window.location.origin}/single-product/${productId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow flex flex-col relative min-h-[240px]">
                {/* Share button */}
                <button
                    className="absolute top-3 right-3 bg-white rounded-full p-1 shadow text-green-600 hover:bg-green-50 transition-colors"
                    onClick={handleShare}
                >
                    <FiShare2 size={18} />
                </button>
                {copied && (
                    <span className="absolute top-10 right-3 bg-green-600 text-white text-xs rounded px-2 py-1 shadow">Lien copié !</span>
                )}
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
                    {whatsappLink ? (
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 rounded-full p-2 text-white hover:bg-green-700 transition-colors ml-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <FiPhone size={16} />
                        </a>
                    ) : (
                        <button className="bg-green-600 rounded-full p-2 text-white opacity-50 cursor-not-allowed ml-auto" disabled>
                            <FiPhone size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MarketplaceProductCard;

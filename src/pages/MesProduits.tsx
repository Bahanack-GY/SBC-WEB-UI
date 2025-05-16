import { useState, useEffect } from 'react';
import BackButton from "../components/common/BackButton";
import MarketplaceProductCard from "../components/MarketplaceProductCard";
import iconGrowth from "../assets/icon/ecommerce.png";
import { useNavigate } from 'react-router-dom';
import { PencilIcon } from "@heroicons/react/24/solid";
import Skeleton from '../components/common/Skeleton';

function MesProduits() {
    const navigate = useNavigate();
    // TODO: Replace with actual data from API
    const [products] = useState([
        {
            id: 1,
            name: "Service WhatsApp Pro",
            brand: "Sniper Business Center",
            price: 5000,
            image: iconGrowth
        },
        {
            id: 2,
            name: "Design Flyer",
            brand: "Sniper Business Center",
            price: 8000,
            image: iconGrowth
        }
    ]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleEdit = (productId: number) => {
        navigate(`/modifier-produit/${productId}`);
    };

    return (
        <div className="p-3 min-h-screen bg-white">
            <div className="flex items-center mb-6">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full">Mes produits</h3>
            </div>
            {loading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="relative">
                            <Skeleton height="h-60" rounded="rounded-xl" />
                            <div className="absolute top-2 right-2">
                                <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                    <p className="text-lg mb-2">Vous n'avez pas encore de produits</p>
                    <p className="text-sm">Commencez par ajouter votre premier produit</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {products.map((product) => (
                        <div key={product.id} className="relative">
                            <MarketplaceProductCard
                                image={product.image}
                                brand={product.brand}
                                name={product.name}
                                price={product.price}
                            />
                            <button
                                onClick={() => handleEdit(product.id)}
                                className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
                            >
                                <PencilIcon className="w-5 h-5 text-green-600" />
                            </button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default MesProduits; 
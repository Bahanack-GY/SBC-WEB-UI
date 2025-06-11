import { useState, useEffect } from 'react';
import BackButton from "../components/common/BackButton";
import MarketplaceProductCard from "../components/MarketplaceProductCard";
import iconGrowth from "../assets/icon/Ecommerce.png";
import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { Product } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';

function MesProduits() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchUserProducts();
    }, []);

    const fetchUserProducts = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await sbcApiService.getUserProducts();
            const data = handleApiResponse(response);
            setProducts(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (productId: string) => {
        navigate(`/modifier-produit/${productId}`);
    };

    const handleDelete = async (productId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
            return;
        }

        try {
            setDeleting(productId);
            const response = await sbcApiService.deleteProduct(productId);
            handleApiResponse(response); // This will throw an error if API reports failure

            // If successful, remove product from local state
            setProducts(products.filter(p => p._id !== productId));
            alert('Produit supprimé avec succès!'); // Success feedback
        } catch (err) {
            console.error("Failed to delete product:", err);
            alert(err instanceof Error ? `Échec de la suppression: ${err.message}` : 'Échec de la suppression du produit.'); // Error feedback
        } finally {
            setDeleting(null);
        }
    };

    const handleRefresh = () => {
        fetchUserProducts();
    };

    return (
        <ProtectedRoute>
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
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
                                    <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                        <p className="text-lg mb-2 text-red-500">Erreur lors du chargement</p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                        <p className="text-lg mb-2">Vous n'avez pas encore de produits</p>
                        <p className="text-sm mb-4">Commencez par ajouter votre premier produit</p>
                        <button
                            onClick={() => navigate('/ajouter-produit')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            Ajouter un produit
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {products.map((product) => (
                            <div key={product._id} className="relative">
                                <MarketplaceProductCard
                                    image={product.images?.[0]?.url || iconGrowth}
                                    brand={product.seller?.name || "Vous"}
                                    name={product.name}
                                    price={product.price}
                                    productId={product._id}
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                        onClick={() => handleEdit(product._id)}
                                        className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
                                        title="Modifier"
                                    >
                                        <PencilIcon className="w-4 h-4 text-green-600" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product._id)}
                                        disabled={deleting === product._id}
                                        className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        title="Supprimer"
                                    >
                                        <TrashIcon className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                                {product.isActive === false && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                                        <span className="text-white font-semibold">Inactif</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}

export default MesProduits;
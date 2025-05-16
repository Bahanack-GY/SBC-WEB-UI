import { useState, useEffect } from 'react';
import BackButton from "../components/common/BackButton";
import Skeleton from '../components/common/Skeleton';

function AjouterProduit() {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        images: [] as File[]
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement product submission logic
        console.log('Form submitted:', formData);
    };

    return (
        <div className="p-3 min-h-screen bg-white">
            <div className="flex items-center mb-6">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full">Ajouter un produit</h3>
            </div>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-20" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-12" rounded="rounded-xl" />
                </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du produit
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                        rows={4}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix (FCFA)
                    </label>
                    <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Catégorie
                    </label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                        required
                    >
                        <option value="">Sélectionner une catégorie</option>
                        <option value="produit">Produit</option>
                        <option value="service">Service</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Images
                    </label>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setFormData({...formData, images: files});
                        }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                    Publier le produit
                </button>
            </form>
            )}
        </div>
    );
}

export default AjouterProduit; 
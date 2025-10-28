import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from "../components/common/BackButton";
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../utils/apiHelpers';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiXCircle, FiLoader } from 'react-icons/fi';
import type { Product } from '../types/api';

const subProducts = [
    "mode et vêtements", "électronique et gadgets", "maison et jardin",
    "beauté et soins personnels", "alimentation et boissons", "santé et bien-être",
    "sport et loisirs", "jouets et jeux", "accessoires automobiles",
    "outils et équipements de bricolage", "animaux de compagnie",
    "livres et médias", "art et artisanat", "produits pour bébés et enfants",
    "fournitures de bureau et papeterie", "équipements de voyage",
    "instruments de musique", "produits technologiques",
    "produits écologiques et durables", "autres"
];

const subServices = [
    "consultation professionnelle", "services de formation et d'apprentissage",
    "services de design", "services de rédaction et de traduction",
    "services de programmation et de développement",
    "services de marketing et de publicité",
    "services de maintenance et de réparation",
    "services de santé et de bien-être",
    "services de consultation juridique",
    "services de planification d'événements", "autres"
];

function ModifierProduit() {
    const { id } = useParams<{ id: string }>(); // Get product ID from URL
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        subcategory: '',
        description: '',
        price: '',
    });
    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]); // Store URLs of images already on server
    const [newImages, setNewImages] = useState<File[]>([]); // Store newly selected File objects
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) {
                setLoading(false);
                setFeedback({ type: 'error', message: "ID du produit manquant." });
                return;
            }
            try {
                setLoading(true);
                const response = await sbcApiService.getProductById(id);
                const product: Product = handleApiResponse(response);
                if (product) {
                    // Capitalize first letter of category to match UI options
                    const displayCategory = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : '';
                    setFormData({
                        name: product.name || '',
                        category: displayCategory,
                        subcategory: product.subcategory || '', // Subcategory from API should directly match accent-less option values
                        description: product.description || '',
                        price: product.price?.toString() || '',
                    });
                    if (product.images && Array.isArray(product.images)) {
                        // Use fileId to generate the full URL for existing images
                        setExistingImageUrls(product.images.map(img => img.url));
                    } else {
                        setExistingImageUrls([]);
                    }
                } else {
                    setFeedback({ type: 'error', message: "Produit introuvable." });
                }
            } catch (err) {
                setFeedback({ type: 'error', message: err instanceof Error ? err.message : "Erreur lors du chargement du produit." });
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]); // Refetch when ID changes

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'category' && prev.category !== value) {
                return { ...prev, [name]: value, subcategory: '' };
            }
            return { ...prev, [name]: value };
        });
        if (feedback) setFeedback(null);
    };

    const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const uploadedFiles = Array.from(e.target.files);
            const validFiles: File[] = [];

            uploadedFiles.forEach(file => {
                if (file.size > 10 * 1024 * 1024) { // 10 MB in bytes
                    setModalContent({ type: 'error', message: `L'image "${file.name}" dépasse la taille maximale autorisée de 10 Mo et ne sera pas ajoutée.` });
                    setShowModal(true);
                } else {
                    validFiles.push(file);
                }
            });

            setNewImages(prev => {
                const combined = [...prev, ...validFiles];
                return combined.slice(0, 10 - existingImageUrls.length); // Ensure total does not exceed max (10)
            });
            setFeedback(null);
        }
    };

    const handleRemoveNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
        if (feedback) setFeedback(null);
    };

    // Note: To remove existing images from the server, the backend API would need
    // a specific way to handle it (e.g., sending a list of file IDs to remove).
    // This UI doesn't explicitly implement deleting existing images from the server
    // directly. It assumes new uploads might replace/append, or the API handles
    // removal if an existing image is not sent back (less common for multipart).
    // For now, we only allow removing newly selected images from the form.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedback(null);

        // Client-side validation for required fields
        if (!formData.name || !formData.category || !formData.description || !formData.price || !formData.subcategory) {
            setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.' });
            setSaving(false);
            return;
        }

        const priceNum = parseFloat(formData.price);
        if (isNaN(priceNum) || priceNum <= 0) {
            setFeedback({ type: 'error', message: 'Le prix doit être un nombre positif.' });
            setSaving(false);
            return;
        }

        try {
            const productToUpdate = {
                name: removeAccents(formData.name),
                category: removeAccents(formData.category.toLowerCase()), // Convert to lowercase and remove accents for API
                subcategory: removeAccents(formData.subcategory), // Remove accents for API
                description: formData.description,
                price: priceNum,
            };

            const response = await sbcApiService.updateProduct(id!, productToUpdate, newImages);
            const result = handleApiResponse(response);

            if (response.isOverallSuccess) {
                setFeedback({ type: 'success', message: 'Produit mis à jour avec succès!' });
                setTimeout(() => {
                    navigate('/mes-produits'); // Redirect after success
                }, 1500);
            } else {
                setFeedback({ type: 'error', message: result.message || 'Échec de la mise à jour du produit.' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
            setFeedback({ type: 'error', message: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    // Determine which subcategories to display based on the selected main category
    // Note: The UI displays capitalized category names, so check against those.
    const currentSubcategories = formData.category === 'Produit' ? subProducts :
        formData.category === 'Service' ? subServices : [];

    if (loading) {
        return (
            <div className="p-3 min-h-screen bg-white">
                <div className="flex items-center mb-6">
                    <BackButton />
                    <h3 className="text-xl font-medium text-center w-full">Modifier le produit</h3>
                </div>
                <div className="space-y-4">
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-20" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-12" rounded="rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen flex flex-col items-center bg-[#f8fafc] p-4">
                <div className="w-full max-w-md">
                    <div className="flex items-center mb-4">
                        <BackButton />
                        <h3 className="text-xl font-medium text-center w-full">Modifier le produit</h3>
                    </div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="w-full max-w-md bg-white rounded-3xl p-8"
                >
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-gray-700 mb-1">Nom du produit</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: Smartphone Samsung Galaxy S23"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1">Catégorie</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white"
                                required
                            >
                                <option value="">Sélectionner une catégorie</option>
                                <option value="Produit">Produit</option>
                                <option value="Service">Service</option>
                            </select>
                        </div>

                        {formData.category && (
                            <div>
                                <label className="block text-gray-700 mb-1">Sous-catégorie</label>
                                <select
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white"
                                    required
                                >
                                    <option value="">Sélectionner une sous-catégorie</option>
                                    {currentSubcategories.map((subcat) => (
                                        // Option value is accent-less to match API, displayed text retains accents
                                        <option key={subcat} value={removeAccents(subcat).toLowerCase()}>{subcat}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Décrivez votre produit ou service..."
                                rows={4}
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1">Prix (FCFA)</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="Ex: 1200.50"
                                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
                                step="0.01"
                                min="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1">Images existantes</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {existingImageUrls.map((url, index) => (
                                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={url} alt={`existing-${index}`} className="w-full h-full object-cover" />
                                        {/* Removed explicit delete button for existing images as API handling is unclear */}
                                    </div>
                                ))}
                                {existingImageUrls.length === 0 && (
                                    <p className="text-sm text-gray-500">Aucune image existante.</p>
                                )}
                            </div>

                            <label className="block text-gray-700 mt-4 mb-1">Ajouter de nouvelles images (max {10 - existingImageUrls.length})</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleNewFileChange}
                                className="block w-full text-sm text-gray-700
                                           file:mr-4 file:py-2 file:px-4
                                           file:rounded-full file:border-0
                                           file:text-sm file:font-semibold
                                           file:bg-blue-50 file:text-blue-700
                                           hover:file:bg-blue-100"
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                                {newImages.map((file, index) => (
                                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`preview-${file.name}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNewImage(index)}
                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                            title="Supprimer cette nouvelle image"
                                        >
                                            <FiXCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                                {/* If more new images can be added, show a placeholder */}
                                {(existingImageUrls.length + newImages.length) < 10 && (
                                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 cursor-pointer">
                                        <FiUploadCloud size={24} />
                                        <input type="file" multiple accept="image/*" onChange={handleNewFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg text-center text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                                {feedback.message}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#115CF6] hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow flex items-center justify-center gap-2 disabled:bg-blue-400"
                            disabled={saving}
                        >
                            {saving ? <FiLoader className="animate-spin" /> : 'Mettre à jour le produit'}
                        </button>
                    </form>
                </motion.div>
            </div>
            {showModal && modalContent && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0.2 }}
                    >
                        <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {modalContent.type === 'success' ? 'Succès' : 'Erreur'}
                        </h4>
                        <p className="text-sm text-gray-700 text-center mb-4">
                            {modalContent.message}
                        </p>
                        <button
                            type="button"
                            className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold shadow hover:bg-blue-600 transition-colors"
                            onClick={() => setShowModal(false)}
                        >
                            Fermer
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </ProtectedRoute>
    );
}

export default ModifierProduit; 
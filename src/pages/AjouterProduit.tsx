import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiXCircle, FiLoader } from 'react-icons/fi';

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

function AjouterProduit() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        category: '', // Can be 'Produit' or 'Service'
        subcategory: '',
        description: '',
        price: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'category' && prev.category !== value) {
                // Reset subcategory when category changes
                return { ...prev, [name]: value, subcategory: '' };
            }
            return { ...prev, [name]: value };
        });
        if (feedback) setFeedback(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];

            newFiles.forEach(file => {
                if (file.size > 10 * 1024 * 1024) { // 10 MB in bytes
                    setModalContent({ type: 'error', message: `L'image "${file.name}" dépasse la taille maximale autorisée de 10 Mo et ne sera pas ajoutée.` });
                    setShowModal(true);
                } else {
                    validFiles.push(file);
                }
            });

            // Limit to 10 images total
            setImages(prev => {
                const combined = [...prev, ...validFiles];
                return combined.slice(0, 10);
            });
            setFeedback(null);
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        if (feedback) setFeedback(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);

        // Client-side validation for required fields
        if (!formData.name || !formData.category || !formData.description || !formData.price || !formData.subcategory) {
            setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.' });
            setLoading(false);
            return;
        }

        const priceNum = parseFloat(formData.price);
        if (isNaN(priceNum) || priceNum <= 0) {
            setFeedback({ type: 'error', message: 'Le prix doit être un nombre positif.' });
            setLoading(false);
            return;
        }

        // According to prdt.md, images are optional, so no validation for `images.length`.

        try {
            const productToCreate = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory,
                description: formData.description,
                price: priceNum,
            };

            const response = await sbcApiService.createProduct(productToCreate, images);
            const result = handleApiResponse(response);

            if (response.isOverallSuccess) {
                setFeedback({ type: 'success', message: 'Produit ajouté avec succès!' });
                setTimeout(() => {
                    navigate('/mes-produits'); // Redirect to my products page after success
                }, 1500);
            } else {
                setFeedback({ type: 'error', message: result.message || 'Échec de l\'ajout du produit.' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
            setFeedback({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    // Determine which subcategories to display based on the selected main category
    const currentSubcategories = formData.category === 'Produit' ? subProducts :
        formData.category === 'Service' ? subServices : [];

    return (
        <ProtectedRoute>
            <div className="min-h-screen flex flex-col items-center bg-[#f8fafc] p-4">
                <div className="w-full max-w-md">
                    <div className="flex items-center mb-4">
                        <BackButton />
                        <h3 className="text-xl font-medium text-center w-full">Ajouter un produit</h3>
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

                        {formData.category && ( // Only show subcategory dropdown if a main category is selected
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
                                        <option key={subcat} value={subcat}>{subcat}</option>
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
                                step="0.01" // Allow decimal values for currency
                                min="0" // Ensure price is non-negative
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1">Images (max 10)</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-700
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100"
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                                {images.map((file, index) => (
                                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`preview-${file.name}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))} // Clean up URL object
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                            title="Supprimer l'image"
                                        >
                                            <FiXCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                                {images.length < 10 && ( // Allow adding more images if limit not reached
                                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 cursor-pointer">
                                        <FiUploadCloud size={24} />
                                        {/* Hidden input to trigger file selection when label is clicked */}
                                        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
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
                            disabled={loading} // Disable button during submission
                        >
                            {loading ? <FiLoader className="animate-spin" /> : 'Ajouter le produit'}
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

export default AjouterProduit; 
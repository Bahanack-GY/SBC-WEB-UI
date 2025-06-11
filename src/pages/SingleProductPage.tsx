import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../components/common/BackButton';
import { useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import Skeleton from '../components/common/Skeleton';

// Define types for product and images
export type ProductImage = { fileId?: string; url?: string };
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: ProductImage[];
  whatsappLink?: string;
  // Add other fields as needed
};

function SingleProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const response = await sbcApiService.getProductDetails(id!);
        setProduct(response.body.data || response.body.product || response.body);
      } catch (e: unknown) {
        console.log(e);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  let images: string[] = ["https://via.placeholder.com/300x300?text=No+Image"];
  if (product && product.images && product.images.length > 0) {
    images = product.images
      .map((img: ProductImage) => img.fileId ? sbcApiService.generateSettingsFileUrl(img.fileId) : img.url)
      .filter((url): url is string => typeof url === 'string' && !!url);
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] px-2 py-4">
        <Skeleton height="h-10" rounded="rounded-xl" className="mb-4 w-full max-w-md" />
        <Skeleton height="h-60" rounded="rounded-2xl" className="mb-4 w-full max-w-md" />
        <Skeleton height="h-8" rounded="rounded-xl" className="mb-2 w-full max-w-md" />
        <Skeleton height="h-8" rounded="rounded-xl" className="mb-2 w-full max-w-md" />
      </div>
    );
  }
  if (!product) {
    return <div className="text-center py-16 text-gray-500">Produit introuvable</div>;
  }

  return (
    <>
      <div className="flex items-center mb-4 px-4">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full text-gray-900">Information du produit</h3>
      </div>
      <div className="min-h-screen flex flex-col items-center bg-[#f8fafc] px-2 py-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-md rounded-3xl p-4"
        >
          {/* Image carousel */}
          <div className="flex flex-col items-center">
            <div className="w-full flex justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImg}
                  src={images[selectedImg]}
                  alt="Produit"
                  className="w-60 h-60 object-contain rounded-2xl bg-gray-50"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
            </div>
            <motion.div className="flex justify-center gap-2 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`w-3 h-3 rounded-full ${i === selectedImg ? 'bg-[#115CF6]' : 'bg-gray-300'}`}
                  aria-label={`Voir l'image ${i + 1}`}
                />
              ))}
            </motion.div>
            <motion.div className="flex gap-2 mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {images.map((img: string, i: number) => (
                <motion.img
                  key={i}
                  src={img}
                  alt="Miniature"
                  className={`w-16 h-16 object-contain rounded-xl border ${i === selectedImg ? 'border-[#115CF6] border-2' : 'border-gray-200'}`}
                  onClick={() => setSelectedImg(i)}
                  style={{ cursor: 'pointer' }}
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              ))}
            </motion.div>
          </div>
          {/* Product info */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h2>
            <p className="text-gray-500 mb-4">{product.description}</p>
            <div className="flex items-center justify-between mt-6 mb-2">
              <span className="text-2xl font-bold text-gray-800">{product.price?.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}</span>
              {product.whatsappLink ? (
                <motion.a
                  href={product.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#115CF6] hover:bg-blue-800 text-white font-bold py-3 px-2 rounded-xl text-lg shadow transition-colors"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Contacter le vendeur
                </motion.a>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default SingleProductPage;

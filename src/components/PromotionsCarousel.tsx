import React, { useState, useEffect } from 'react';

interface PromotionsCarouselProps {
    images: string[];
}

const PromotionsCarousel: React.FC<PromotionsCarouselProps> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    // Optional: Auto-advance carousel
    // useEffect(() => {
    //   const timer = setTimeout(() => {
    //     goToNext();
    //   }, 5000); // Change image every 5 seconds
    //   return () => clearTimeout(timer);
    // }, [currentIndex, images.length]);

    if (!images || images.length === 0) {
        return null; // Don't render if no images
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl">
            <div
                className="flex transition-transform ease-out duration-500"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((image, index) => (
                    <div key={index} className="w-full flex-shrink-0">
                        <img
                            src={image}
                            alt={`Promotion ${index + 1}`}
                            className="w-full h-48 object-cover"
                        />
                    </div>
                ))}
            </div>

            {/* Navigation Buttons */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
                <button
                    onClick={goToPrevious}
                    className="bg-white bg-opacity-30 text-gray-800 p-3 rounded-full shadow-md hover:bg-opacity-50 transition"
                >
                    &lt;
                </button>
                <button
                    onClick={goToNext}
                    className="bg-white bg-opacity-30 text-gray-800 p-3 rounded-full shadow-md hover:bg-opacity-50 transition"
                >
                    &gt;
                </button>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {images.map((image, index) => (
                    <div
                        key={index}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-gray-400'}`}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default PromotionsCarousel;
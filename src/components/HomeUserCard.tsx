//Here is the card on the home page

import { FaLink, FaStar, FaUserAlt, FaUsers } from "react-icons/fa";
import { FaWandSparkles } from "react-icons/fa6";
import { motion } from "framer-motion";

interface HomeUserCardProps {
    name: string;
    image: string;
    affiliates: number;
    status: string;
    promoCode: string;  
}
const date = new Date();
const time = date.getHours();
let greeting = "";

if (time > 12){
    greeting = "Bonsoir";
}else {
    greeting = "Bonjour";
}


function copyLink(link: string) {
    navigator.clipboard.writeText(link);
}

function HomeUserCard({name, image, affiliates, status, promoCode}: HomeUserCardProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex flex-col"
        >
            <div className="flex justify-between items-center">
            <motion.p 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white capitalize flex items-center gap-2 text-lg ml-4"
            >
                <FaUserAlt />Votre profil
            </motion.p>
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#F68F0F] bg-white rounded-full p-3" 
                onClick={() => copyLink(`https://sniperbuisnesscenter.com/signup?affiliationCode=${promoCode}`)}
            >
                <FaLink />
            </motion.button>
            </div>
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2"
            >
            <motion.img 
                whileHover={{ scale: 1.05 }}
                src={image} 
                alt={name} 
                className="w-28 h-28 object-cover rounded-full border-4 border-white"
            />
            <div className="flex flex-col">
            <motion.p 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white text-lg"
            >
                {greeting}
            </motion.p>
            <motion.p 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="font-bold text-[#F68F0F] text-3xl"
            >
                {name}
            </motion.p>
            <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3"
            >
            <p className="text-white text-sm flex items-center gap-1"><FaStar />{status}</p>
            <p className="text-white text-sm flex items-center gap-1"><FaUsers />{affiliates}</p>
            <p className="text-white text-sm flex items-center gap-1"><FaWandSparkles />{promoCode}</p>
            </motion.div>
            </div>
            </motion.div>
        </motion.div>
    )
}

export default HomeUserCard;


import  { useState, useEffect } from 'react';
import HomeUserCard from "../components/HomeUserCard"
import HomeButtons from "../components/HomeButtons"
import BalanceIcon from "../assets/icon/balance.png"
import { FaBook, FaPhone } from "react-icons/fa";
import HomeBalanceCard from "../components/HomeBalanceCard";
import { FaCartShopping } from "react-icons/fa6";
import Header from '../components/common/Header'
import Skeleton from '../components/common/Skeleton';

function Home() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <div className="p-3 h-screen">
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton height="h-32" rounded="rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
            </div>
            <Skeleton height="h-32" rounded="rounded-2xl" />
          </div>
        ) : (
          <>
            <HomeUserCard name="John Doe" image="https://images.unsplash.com/photo-1736896165046-5df757614776?q=80&w=1956&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" affiliates={10} status="Abonné" promoCode="Geo237" />
            <div className="flex flex-col py-4">
              <h2 className="text-2xl font-bold">Nos services</h2>
              <div className="flex justify-around  overflow-x-auto gap-3 ">
                <HomeButtons icon={<FaBook size={30}/>} title="Formations" url="https://www.google.com" />
                <HomeButtons icon={<FaCartShopping size={30}/>} title="Marketplace" url="/marketplace" />
                <HomeButtons icon={<FaPhone size={30}/>} title="Contacts" url="/contacts" />
              </div>
            </div>
            <HomeBalanceCard balance={50000} icon={<img src={BalanceIcon} alt="Balance" className="size-48"/>}/>
            <div className="bg-[#F68F0F] rounded-xl p-3 my-5 flex flex-col gap-2"></div>
          </>
        )}
      </div>
    </>
  )
}

export default Home

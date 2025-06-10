import { FiDownload } from "react-icons/fi";
import logo from "../../assets/img/logo-sbc.png";
import { AiFillWallet } from "react-icons/ai";
import { FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  return (
    <>
      <header>
        <div className="flex justify-between items-center px-3 py-1  bg-white">
          <img src={logo} alt="logo" className="w-32 " />
          <div className="flex gap-3 items-center">
            <button onClick={() => { }}><FiDownload size={22} /></button>
            <button onClick={() => navigate("/wallet")}><AiFillWallet size={22} /></button>
            <button onClick={() => navigate("/profile")}><FaUser size={22} /></button>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;

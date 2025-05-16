import { FiDownload } from "react-icons/fi";
import logo from "../../assets/img/logo-sbc.png";
import { AiFillWallet } from "react-icons/ai";
import { FaUser } from "react-icons/fa";

function handleOpenUrl(url: string) {
    window.location.href = url;
}
function Header() {
  return (
    <>
      <header>
        <div className="flex justify-between items-center px-3 py-1  bg-white">
            <img src={logo} alt="logo" className="w-32 "/>
            <div className="flex gap-3 items-center">
                <button onClick={() => handleOpenUrl("")}><FiDownload size={22}/></button>
                <button onClick={() => handleOpenUrl("/wallet")}><AiFillWallet size={22}/></button>
                <button onClick={() => handleOpenUrl("/profile")}><FaUser size={22}/></button>
            </div>
        </div>
      </header>
    </>
  );
}

export default Header;

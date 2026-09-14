import logo from "../assets/logo.png"
import { useState } from "react";

export default function Header(){
    const[openModal, setOpenModal] = useState(false);
    const[openOTP, setOpenOTP] = useState(false);


    return(
        <div className="font-Inter">
<header className="fixed w-full z-20 top-0 inset-s-0">
  <nav className="bg-neutral-primary bg-gray-50 md:mx-1 ">
      <div className="flex flex-wrap justify-between items-center mx-auto  p-4">
          <a href="https://flowbite.com" className="flex items-center space-x-3 rtl:space-x-reverse">
              <img src={logo} className="h-10 md:h-17" alt="Flowbite Logo" />
          </a>
          <div className="flex items-center md:space-x-6 space-x-2.5">
              <label className="text-xs md:text-sm text-body">Oyekan Olawale
              </label>
              <button onClick={openModal === false ? () => setOpenModal(true) : ( ) => setOpenModal(false) } className="md:text-sm text-xs font-medium text-fg-brand md:p-4 p-3 transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 rounded-2xl bg-yellow-300">Add Number +</button>
             </div>
             {
                openModal && 
<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md justify-center items-center flex">

   
<form className="max-w-sm mx-auto bg-white p-6 pt-8 rounded-2xl">
    <h1 className="block mb-2.5 text-sm font-bold text-heading">ADD MTN NUMBER</h1>
    <p className="text-sm text-gray-500">Enter your Nigerian MTN phone number to receive a one-time verification code (OTP).</p>
  <div className="my-5">
    <input type="email" id="email" className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body" placeholder="+2348036324797" required />
    {!openOTP && <p className="text-sm text-gray-400">A 6-digit OTP will be sent via SMS to verify ownership of this SIM line.</p>}
  </div>
  <div className="mb-5">
    {openOTP &&  (<><input type="password" id="password" className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body" placeholder="••••••" required />
    <p className="text-gray-500">Input the OTP sent to the given number.</p></>)}
  </div>
  <div className="gap-6 flex justify-between">
    <button type="submit" onClick={() => {setOpenModal(false); setOpenOTP(false)}} className="text-white bg-red-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">Cancel</button>
  <button type="submit" onClick={() => setOpenOTP(true)} className={openOTP ? `hidden` : `text-white bg-yellow-400 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none disabled:cursor-not-allowed`} disabled={openOTP}>Send OTP</button>

  {openOTP && <button type="submit" className="text-white bg-green-600 box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none disabled:cursor-not-allowed">Confirm OTP</button>}
  </div>
</form>

</div>
             }
</div>
  </nav>
</header>

        </div>
    )
}
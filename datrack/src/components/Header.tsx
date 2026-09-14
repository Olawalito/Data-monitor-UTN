import logo from "../assets/logo.png"

export default function Header(){
    return(
        <>
        
<header className="fixed w-full z-20 top-0 inset-s-0">
  <nav className="bg-neutral-primary bg-gray-50 md:mx-1 ">
      <div className="flex flex-wrap justify-between items-center mx-auto  p-4">
          <a href="https://flowbite.com" className="flex items-center space-x-3 rtl:space-x-reverse">
              <img src={logo} className="h-10 md:h-17" alt="Flowbite Logo" />
          </a>
          <div className="flex items-center md:space-x-6 space-x-2.5">
              <label className="text-xs md:text-sm text-body">Oyekan Olawale
              </label>
              <button  className="md:text-sm text-xs font-medium text-fg-brand md:p-4 p-3 transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 rounded-2xl">Add Number +</button>
              <button data-modal-target="select-modal" data-modal-toggle="select-modal" className="text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" type="button">
  Toggle modal
</button></div>
      </div>
  </nav>
</header>

        </>
    )
}
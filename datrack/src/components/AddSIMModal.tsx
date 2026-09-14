export default function Modal(){
    return(
        <>
        <div id="select-modal" tabIndex={-1} aria-hidden="true" className="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
    <div className="relative p-4 w-full max-w-md max-h-full">
        
        <div className="relative bg-neutral-primary-soft border border-default rounded-base shadow-sm p-4 md:p-6">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-default pb-4 md:pb-5">
                <h3 className="text-lg font-medium text-heading">
                    Open positions
                </h3>
                <button type="button" className="text-body bg-transparent hover:bg-neutral-tertiary hover:text-heading rounded-base text-sm w-9 h-9 ms-auto inline-flex justify-center items-center" data-modal-hide="select-modal">
                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
                    <span className="sr-only">Close modal</span>
                </button>
            </div>
            
            <div className="pt-4 md:pt-6">
                <p className="text-body mb-4">Select your desired position:</p>
                <ul className="space-y-4 mb-4">
                    <li>
                        <input type="radio" id="job-1" name="job" value="job-1" className="hidden peer" required />
                        <label htmlFor="job-1" className="inline-flex items-center w-full p-5 text-body bg-neutral-primary-soft border border-default rounded-base cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong">
                            <div className="flex items-center justify-center w-9 h-9 rounded bg-brand-soft text-fg-brand-strong">
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M7.111 20A3.111 3.111 0 0 1 4 16.889v-12C4 4.398 4.398 4 4.889 4h4.444a.89.89 0 0 1 .89.889v12A3.111 3.111 0 0 1 7.11 20Zm0 0h12a.889.889 0 0 0 .889-.889v-4.444a.889.889 0 0 0-.889-.89h-4.389a.889.889 0 0 0-.62.253l-3.767 3.665a.933.933 0 0 0-.146.185c-.868 1.433-1.581 1.858-3.078 2.12Zm0-3.556h.009m7.933-10.927 3.143 3.143a.889.889 0 0 1 0 1.257l-7.974 7.974v-8.8l3.574-3.574a.889.889 0 0 1 1.257 0Z"/></svg>
                            </div>                           
                            <div className="block ms-2.5">
                                <div className="w-full text-base font-medium">UI/UX Engineer</div>
                                <div className="w-full font-normal">Flowbite</div>
                            </div>
                            <svg className="w-5 h-5 ms-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>
                        </label>
                    </li>
                    <li>
                        <input type="radio" id="job-2" name="job" value="job-2" className="hidden peer"/>
                        <label htmlFor="job-2" className="inline-flex items-center justify-between w-full p-5 text-body bg-neutral-primary-soft border border-default rounded-base cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong">
                            <div className="flex items-center justify-center w-9 h-9 rounded bg-brand-soft text-fg-brand-strong">
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8 8-4 4 4 4m8 0 4-4-4-4m-2-3-4 14"/></svg>
                            </div> 
                            <div className="block ms-2.5">
                                <div className="w-full text-base font-medium">React Developer</div>
                                <div className="w-full font-normal">Alphabet</div>
                            </div>
                            <svg className="w-5 h-5 ms-auto rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>
                        </label>
                    </li>
                    <li>
                        <input type="radio" id="job-3" name="job" value="job-3" className="hidden peer"/>
                        <label htmlFor="job-3" className="inline-flex items-center justify-between w-full p-5 text-body bg-neutral-primary-soft border border-default rounded-base cursor-pointer peer-checked:hover:bg-brand-softer peer-checked:border-brand-subtle peer-checked:bg-brand-softer hover:bg-neutral-secondary-medium peer-checked:text-fg-brand-strong">
                            <div className="flex items-center justify-center w-9 h-9 rounded bg-brand-soft text-fg-brand-strong">
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 6c0 1.657-3.134 3-7 3S5 7.657 5 6m14 0c0-1.657-3.134-3-7-3S5 4.343 5 6m14 0v6M5 6v6m0 0c0 1.657 3.134 3 7 3s7-1.343 7-3M5 12v6c0 1.657 3.134 3 7 3s7-1.343 7-3v-6"/></svg>
                            </div> 
                            <div className="block ms-2.5">
                                <div className="w-full text-base font-medium">Full Stack Engineer</div>
                                <div className="w-full font-normal">Apple</div>
                            </div>
                            <svg className="w-5 h-5 ms-auto rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>
                        </label>
                    </li>
                </ul>
                <button type="submit" className="w-full inline-flex items-center justify-center text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none">
                    Next step
                    <svg className="w-4 h-4 ms-1.5 -me-0.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>
                </button>
            </div>
        </div>
    </div>
</div> 
        </>
    )
}
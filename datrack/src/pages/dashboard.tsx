import Header from "../components/Header"
import Table from "../components/table"

export default function(){
    return(
        <>
        <Header/>
        <div className="min-h-screen w-full bg-gray-50 flex justify-center items-start pt-6 md:pt-12">
            <Table/>
        </div>
        </>
    )
}
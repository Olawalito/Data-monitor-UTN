import { dataInfo } from "../data/data"

export default function Table(){
    return(
        <>
<div className="relative bg-white rounded-2xl overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default md:mt-50 mt-25 mx-1 md:mx-32">
    <table className="w-full text-sm text-left rtl:text-right text-body">
        <thead className="bg-neutral-secondary-soft border-b border-default">
            <tr>
                <th scope="col" className="md:px-6 px-1 py-3 font-medium">
                  Phone Number
                </th>
                <th scope="col" className="md:px-6 px-1 font-medium">
                    Data Balance
                </th>
                <th scope="col" className="md:px-6 px-1 font-medium">
                    Expiry Date
                </th>
                <th scope="col" className="md:px-6 px-1 font-medium">
                    Action
                </th>
            </tr>
        </thead>
        <tbody>
            {dataInfo.map(
                (data) => (
                 <tr className="odd:bg-neutral-primary even:bg-neutral-secondary-soft border-b border-default">
                <th scope="row" className="md:px-6 px-1 font-medium text-heading whitespace-nowrap">
                   {data.number}
                </th>
                <td className="md:px-6 px-1">
                    {data.balance}
                </td>
                <td className="md:px-6 px-1">
                    {data.Expiry}
                </td>
                <td className="md:px-6 px-1">
                    <button className="bg-red-600 rounded-2xl text-white p-3 my-4 font-medium text-fg-brand transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110">Remove</button>
                </td>
            </tr>
                )
            )}
            

        </tbody>
    </table>
</div>

        </>
    )
}
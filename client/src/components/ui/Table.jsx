import React from 'react';

function Table({ columns, data }) {
    return (
        <div className="data-table-container">
            <table className="data-table w-full">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="text-center">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center p-4 text-gray-500">
                                لا توجد بيانات للعرض
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((col) => (
                                    <td key={col.key} className="text-center p-4">
                                        {row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default Table;

import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div className="pagination-footer">
            <button
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                السابق
            </button>

            <div className="pagination-text">
                الصفحة {currentPage} من {totalPages}
            </div>

            <button
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                التالي
            </button>
        </div>
    );
}

export default Pagination;

import { useState, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  initialItemsPerPage?: number;
}

export const usePagination = ({ 
  totalItems, 
  initialItemsPerPage = 20 
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Reset to page 1 if current page is out of bounds
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginate = <T,>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    paginate,
  };
};



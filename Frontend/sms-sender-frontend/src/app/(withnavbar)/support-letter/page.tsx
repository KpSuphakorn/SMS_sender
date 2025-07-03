"use client";
import { useState, useMemo, useCallback } from "react";
import { DatesRangeValue } from '@mantine/dates';

// Import types and utilities
import { Book } from './types';
import { createDummyBooks } from './mockData';
import { isDateInRange } from './utils';

// Import components
import {
  Header,
  SearchAndFilters,
  BulkActionsBar,
  BookCard,
  CaseModal,
  NoResults,
  FloatingActionButton
} from './components';

// Main component
export default function SupportLetterPage() {
  // State management
  const [books] = useState<Book[]>(createDummyBooks());
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);
  const [selected, setSelected] = useState<string[]>([]);
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DatesRangeValue) => {
    setDateRange(range);
    
    // Only close popover if both dates are selected or if range is cleared
    const [start, end] = range;
    if ((start && end) || (!start && !end)) {
      setPopoverOpened(false);
    }
  }, []);

  // Enhanced filtering logic
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        book.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.date.includes(searchTerm) ||
        book.cases.some(c => c.sender.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const statusMatch = statusFilter === "" || book.status === statusFilter;

      // Date range filter
      const dateMatch = isDateInRange(book.date, dateRange[0], dateRange[1]);

      return searchMatch && statusMatch && dateMatch;
    });
  }, [books, searchTerm, statusFilter, dateRange]);

  // Event handlers
  const handleCheck = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filteredBookIds = filteredBooks.map(book => book.id);
    const allFilteredSelected = filteredBookIds.every(id => selected.includes(id));
    
    if (allFilteredSelected) {
      setSelected(prev => prev.filter(id => !filteredBookIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...filteredBookIds])]);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateRange([null, null]);
    setPopoverOpened(false);
  };

  const handleApprove = () => {
    if (selected.length === 0) return;
    alert(`กำลังดำเนินการอนุมัติหนังสือ:\n${selected.join('\n')}\n\nจำนวน: ${selected.length} รายการ`);
  };

  // Computed values
  const allFilteredSelected = filteredBooks.length > 0 && filteredBooks.every(book => selected.includes(book.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header bookCount={books.length} selectedCount={selected.length} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <SearchAndFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateRange={dateRange}
          setDateRange={handleDateRangeChange}
          popoverOpened={popoverOpened}
          setPopoverOpened={setPopoverOpened}
          totalBooks={books.length}
          filteredCount={filteredBooks.length}
        />

        <BulkActionsBar
          allFilteredSelected={allFilteredSelected}
          selected={selected}
          filteredBooks={filteredBooks}
          totalBooks={books.length}
          onSelectAll={handleSelectAll}
          onApprove={handleApprove}
        />

        {/* Results */}
        {filteredBooks.length === 0 ? (
          <NoResults onClearFilters={handleClearAllFilters} />
        ) : (
          <div className="grid gap-8">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isSelected={selected.includes(book.id)}
                onToggleSelect={() => handleCheck(book.id)}
                onViewDetails={() => setModalBook(book)}
              />
            ))}
          </div>
        )}

        <FloatingActionButton 
          selectedCount={selected.length}
          onApprove={handleApprove}
        />
      </div>

      <CaseModal book={modalBook} onClose={() => setModalBook(null)} />
    </div>
  );
}
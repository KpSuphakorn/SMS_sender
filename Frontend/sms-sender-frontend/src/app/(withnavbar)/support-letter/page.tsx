"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DatesRangeValue } from '@mantine/dates';
import getPendingSenders from "@/libs/getPendingSenders";
import approveRequest from "@/libs/approveRequest";

// Import types and utilities
import { Book } from './types';
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
  const { data: session } = useSession();
  
  // State management
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);
  const [selected, setSelected] = useState<string[]>([]);
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [approvingRequests, setApprovingRequests] = useState<Set<string>>(new Set());

  // Helper function to map API status to display status
  const STATUS_ORDER = [
    { key: "pending", label: "ขอข้อมูลแล้ว" },
    { key: "received", label: "ได้รับข้อมูลแล้ว" },
    { key: "suspension_requested", label: "ขอระงับแล้ว" },
    { key: "suspended", label: "ระงับแล้ว" }
  ];

  const mapStatusToDisplay = (statusArray: any[]) => {
    if (!Array.isArray(statusArray)) return STATUS_ORDER.map(s => ({ key: s.key, label: s.label, done: false }));
    
    const statusNames = statusArray.map(s => 
      typeof s === "string" ? s : s?.name
    ).filter(Boolean);

    const present = new Set(statusNames);

    return STATUS_ORDER.map(s => ({
      key: s.key,
      label: s.label,
      done: present.has(s.key)
    }));
  };

  // Function to group cases by request_id and create books
  const processRawDataToBooks = useCallback((rawData: any[]): Book[] => {
    console.log('🔄 Processing raw data to books. Input count:', rawData.length);
    
    // Group cases by request_id
    const requestGroups = new Map<string, any[]>();
    
    rawData.forEach((item, index) => {
      console.log(`🔄 Processing item ${index + 1}:`, {
        id: item._id?.$oid,
        sender_name: item.sender_name,
        request_ids: item.request_ids
      });
      
      if (item.request_ids && item.request_ids.length > 0) {
        item.request_ids.forEach((requestId: any) => {
          const id = requestId.id;
          console.log(`🔄 Found request_id: ${id} for case ${item.sender_name}`);
          
          if (!requestGroups.has(id)) {
            requestGroups.set(id, []);
            console.log(`🔄 Created new group for request_id: ${id}`);
          }
          requestGroups.get(id)!.push({
            ...item,
            requestId: requestId
          });
          console.log(`🔄 Added case to group ${id}. Group now has ${requestGroups.get(id)!.length} cases`);
        });
      } else {
        console.log(`⚠️ Item ${index + 1} has no request_ids:`, item);
      }
    });

    console.log('🔄 Request groups created:', Array.from(requestGroups.keys()));
    console.log('🔄 Total groups:', requestGroups.size);

    // Convert groups to books
    const books: Book[] = [];
    requestGroups.forEach((cases, requestId) => {
      console.log(`🔄 Creating book for request_id: ${requestId} with ${cases.length} cases`);
      
      // Count telco providers
      const telcoCounts = { ais: 0, trueDtac: 0, nt: 0, other: 0 };
      
      const processedCases = cases.map((item, idx) => {
        const telco = item.mobile_provider || 'Other';
        
        // Count telcos
        switch (telco.toUpperCase()) {
          case 'AIS': telcoCounts.ais++; break;
          case 'TRUE':
          case 'DTAC': telcoCounts.trueDtac++; break;
          case 'NT': telcoCounts.nt++; break;
          default: telcoCounts.other++; break;
        }

        return {
          id: item._id?.$oid || `${requestId}-${idx}`,
          date: item.date,
          sender: item.sender_name || `Sender ${idx + 1}`,
          telco: telco as any,
          actualTelco: telco as any,
          statuses: mapStatusToDisplay(item.status || []),
          details: `รายละเอียดของเคส ${item.sender_name || 'Unknown'}\nชื่อเต็ม: ${item.full_name || 'ไม่ระบุ'}\nเบอร์โทร: ${item.phone_number || 'ไม่ระบุ'}\nค่ายมือถือ: ${item.mobile_provider || 'ไม่ระบุ'}\nวันที่สร้าง: ${item.created_at ? new Date(item.created_at.$date || item.created_at).toLocaleString('th-TH') : 'ไม่ระบุ'}\nอัปเดตล่าสุด: ${item.updated_at ? new Date(item.updated_at.$date || item.updated_at).toLocaleString('th-TH') : 'ไม่ระบุ'}`,
          phone_number: item.phone_number || 'ไม่ระบุ',
          full_name: item.full_name || 'ไม่ระบุ',
          created_at: item.created_at?.$date || item.created_at || '',
          updated_at: item.updated_at?.$date || item.updated_at || '',
          fields: item.fields || [],
          request_ids: item.request_ids || [],
          reply_file_id: item.reply_file_id?.$oid || item.reply_file_id,
          is_response_submitted: item.is_response_submitted || false, // Include response status
        };
      });

      // Check if any case in this book has been responded to
      const hasResponseSubmitted = processedCases.some(c => c.is_response_submitted);

      // Determine book status based on cases
      let bookStatus: 'urgent' | 'processing' | 'completed' | 'pending' = 'pending';
      const allCompleted = processedCases.every(c => c.statuses.every(s => s.done));
      const hasUrgent = processedCases.some(c => c.statuses.some(s => s.key === 'suspension_requested' && s.done));
      const hasProcessing = processedCases.some(c => c.statuses.some(s => s.done && !c.statuses.every(status => status.done)));
      
      if (allCompleted) bookStatus = 'completed';
      else if (hasUrgent) bookStatus = 'urgent';
      else if (hasProcessing) bookStatus = 'processing';

      // Get the most recent date from cases
      const latestDate = processedCases.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest) ? current.date : latest;
      }, processedCases[0]?.date || '');

      const newBook = {
        id: requestId,
        date: latestDate,
        senderCount: processedCases.length,
        ais: telcoCounts.ais,
        trueDtac: telcoCounts.trueDtac,
        nt: telcoCounts.nt,
        other: telcoCounts.other,
        status: bookStatus,
        cases: processedCases,
        is_response_submitted: hasResponseSubmitted, // Track if any case has been responded to
        canApprove: !hasResponseSubmitted // Can only approve if no responses have been submitted
      };
      
      console.log(`✅ Created book:`, {
        id: newBook.id,
        date: newBook.date,
        senderCount: newBook.senderCount,
        status: newBook.status,
        telcoCounts: { ais: newBook.ais, trueDtac: newBook.trueDtac, nt: newBook.nt, other: newBook.other }
      });
      
      books.push(newBook);
    });

    console.log('✅ Final books created:', books.length);
    console.log('✅ Books summary:', books.map(b => ({ id: b.id, cases: b.senderCount, status: b.status })));

    // Sort books by date (newest first)
    return books.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!session?.user?.token) {
          setError('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
          setLoading(false);
          return;
        }
        
        // Fetch pending senders data (which includes is_response_submitted field)
        const data = await getPendingSenders(session.user.token);
        console.log('📊 Raw data from API:', data);
        console.log('📊 Total cases fetched:', data.length);
        
        // Filter data to only include cases with request_ids
        const casesWithRequestIds = data.filter((item: any) => 
          item.request_ids && item.request_ids.length > 0
        );
        console.log('📊 Cases with request_ids:', casesWithRequestIds);
        console.log('📊 Number of cases with request_ids:', casesWithRequestIds.length);
        
        // Log some sample request_ids
        casesWithRequestIds.forEach((item: any, index: number) => {
          if (index < 3) { // Log first 3 items
            console.log(`📊 Case ${index + 1} request_ids:`, item.request_ids);
            console.log(`📊 Case ${index + 1} is_response_submitted:`, item.is_response_submitted);
          }
        });
        
        // Process data to create books
        const processedBooks = processRawDataToBooks(casesWithRequestIds);
        console.log('📊 Processed books:', processedBooks);
        console.log('📊 Number of books created:', processedBooks.length);
        
        setBooks(processedBooks);
        
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [processRawDataToBooks, session?.user?.token]);

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
    // Check if this book has response submitted
    const book = books.find(b => b.id === id);
    if (book?.is_response_submitted) {
      alert('ไม่สามารถเลือกคำขอนี้ได้ เนื่องจากได้รับการตอบกลับจากผู้ให้บริการแล้ว');
      return;
    }
    
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    // Only include books that don't have responses submitted
    const selectableBookIds = filteredBooks
      .filter(book => !book.is_response_submitted)
      .map(book => book.id);
    
    const allSelectableSelected = selectableBookIds.every(id => selected.includes(id));
    
    if (allSelectableSelected) {
      // Deselect all selectable books
      setSelected(prev => prev.filter(id => !selectableBookIds.includes(id)));
    } else {
      // Select all selectable books
      setSelected(prev => [...new Set([...prev, ...selectableBookIds])]);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateRange([null, null]);
    setPopoverOpened(false);
  };

  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session?.user?.token) {
        setError('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
        setLoading(false);
        return;
      }
      
      // Fetch pending senders data (which includes is_response_submitted field)
      const data = await getPendingSenders(session.user.token);
      
      // Filter data to only include cases with request_ids
      const casesWithRequestIds = data.filter((item: any) => 
        item.request_ids && item.request_ids.length > 0
      );
      
      // Process data to create books
      const processedBooks = processRawDataToBooks(casesWithRequestIds);
      setBooks(processedBooks);
      
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError('ไม่สามารถรีเฟรชข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [processRawDataToBooks, session?.user?.token]);

  const handleApprove = useCallback(async () => {
    if (selected.length === 0) {
      alert('กรุณาเลือกคำขอที่ต้องการอนุมัติ');
      return;
    }
    
    if (!session?.user?.token) {
      alert('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    // Check if any selected books already have responses submitted
    const selectedBooks = books.filter(book => selected.includes(book.id));
    const booksWithResponses = selectedBooks.filter(book => book.is_response_submitted);
    
    if (booksWithResponses.length > 0) {
      const responseMessage = booksWithResponses.length === selectedBooks.length
        ? `ไม่สามารถอนุมัติได้ เนื่องจากคำขอทั้งหมดที่เลือกได้รับการตอบกลับจากผู้ให้บริการแล้ว:\n\n${booksWithResponses.map(b => b.id).join('\n')}`
        : `ไม่สามารถอนุมัติคำขอดังต่อไปนี้ได้ เนื่องจากได้รับการตอบกลับจากผู้ให้บริการแล้ว:\n\n${booksWithResponses.map(b => b.id).join('\n')}\n\nกรุณาเลือกเฉพาะคำขอที่ยังไม่ได้รับการตอบกลับ`;
      
      alert(responseMessage);
      return;
    }

    const requestIds = selected;
    const approvalConfirm = confirm(
      `คุณต้องการอนุมัติหนังสือสำหรับคำขอดังต่อไปนี้หรือไม่?\n\n` +
      `Request IDs:\n${requestIds.join('\n')}\n\n` +
      `จำนวน: ${requestIds.length} คำขอ`
    );
    
    if (!approvalConfirm) return;

    // Track which requests are being approved
    setApprovingRequests(new Set(requestIds));
    
    try {
      const approvalResults = [];
      
      // Approve each request sequentially
      for (const requestId of requestIds) {
        try {
          console.log(`🔄 Approving request: ${requestId}`);
          const result = await approveRequest(requestId, session.user.token);
          approvalResults.push({ requestId, success: true, result });
          console.log(`✅ Successfully approved request: ${requestId}`, result);
        } catch (error) {
          console.error(`❌ Failed to approve request: ${requestId}`, error);
          approvalResults.push({ 
            requestId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      // Show results
      const successCount = approvalResults.filter(r => r.success).length;
      const failCount = approvalResults.filter(r => !r.success).length;
      
      if (successCount > 0 && failCount === 0) {
        alert(`✅ อนุมัติหนังสือสำเร็จ!\n\nจำนวนที่อนุมัติ: ${successCount} คำขอ`);
        // Clear selection
        setSelected([]);
        // Refresh data to show updated status
        await handleRefresh();
      } else if (successCount > 0 && failCount > 0) {
        const failedRequests = approvalResults
          .filter(r => !r.success)
          .map(r => `${r.requestId}: ${r.error}`)
          .join('\n');
        alert(
          `⚠️ อนุมัติบางส่วนสำเร็จ\n\n` +
          `สำเร็จ: ${successCount} คำขอ\n` +
          `ล้มเหลว: ${failCount} คำขอ\n\n` +
          `รายการที่ล้มเหลว:\n${failedRequests}`
        );
        // Clear selection for successful ones
        const successfulIds = approvalResults.filter(r => r.success).map(r => r.requestId);
        setSelected(prev => prev.filter(id => !successfulIds.includes(id)));
        // Refresh data
        await handleRefresh();
      } else {
        const failedRequests = approvalResults
          .map(r => `${r.requestId}: ${r.error}`)
          .join('\n');
        alert(`❌ ไม่สามารถอนุมัติได้\n\n${failedRequests}`);
      }
      
    } catch (error) {
      console.error('❌ Approval process failed:', error);
      alert(`เกิดข้อผิดพลาดในการอนุมัติ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setApprovingRequests(new Set());
    }
  }, [selected, session?.user?.token, handleRefresh, books]);

  // Computed values - only consider books that can be selected (haven't been responded to)
  const selectableBooks = filteredBooks.filter(book => !book.is_response_submitted);
  const allFilteredSelected = selectableBooks.length > 0 && selectableBooks.every(book => selected.includes(book.id));

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header bookCount={0} selectedCount={0} onRefresh={handleRefresh} isLoading={true} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-lg font-semibold text-gray-600">กำลังโหลดข้อมูลหนังสือขออนุมัติ...</div>
            <div className="text-sm text-gray-500 mt-2">โปรดรอสักครู่</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header bookCount={0} selectedCount={0} onRefresh={handleRefresh} isLoading={false} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <div className="text-xl font-semibold text-red-600 mb-2">{error}</div>
            <button 
              onClick={handleRefresh}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header 
        bookCount={books.length} 
        selectedCount={selected.length} 
        onRefresh={handleRefresh}
        isLoading={loading}
      />

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
          isApproving={approvingRequests.size > 0}
        />

        {/* Results */}
        {filteredBooks.length === 0 ? (
          books.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <div className="text-xl font-semibold text-gray-600 mb-2">
                ไม่พบหนังสือขออนุมัติในระบบ
              </div>
              <div className="text-gray-500">
                ยังไม่มีเคสที่มี Request ID ในระบบ หรือยังไม่มีการส่งข้อมูลไปยังหน่วยงานที่เกี่ยวข้อง
              </div>
            </div>
          ) : (
            <NoResults onClearFilters={handleClearAllFilters} />
          )
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
          isApproving={approvingRequests.size > 0}
        />
      </div>

      <CaseModal book={modalBook} onClose={() => setModalBook(null)} />
    </div>
  );
}
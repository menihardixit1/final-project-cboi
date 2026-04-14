import { useEffect, useMemo, useState } from 'react'
import { authStorageKeys } from '../../config/authConfig'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'
import { getReportStatus, submitTransactionReportQuery } from '../../services/reportApi'
import { storage } from '../../utils/storage'
import '../../components/portal/styles/ReportsPage.css'

// List of months for monthly filter dropdown
const monthlyOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Table column configuration (key -> API field, label -> UI header)
const reportColumns = [
  { key: 'Account_Number', label: 'Account Number' },
  { key: 'VPA_ID', label: 'VPA ID' },
  { key: 'Date_&_Time', label: 'Date & Time' },
  { key: 'Transaction_Amount', label: 'Transaction Amount' },
  { key: 'Transaction_Id', label: 'Transaction ID' },
  { key: 'RRN', label: 'RRN' },
]

const excelExportColumns = [
  { key: 'serialNumber', label: 'S. No.', type: 'Number' },
  { key: 'Account_Number', label: 'Account Number', type: 'String' },
  { key: 'VPA_ID', label: 'VPA ID', type: 'String' },
  { key: 'Date_&_Time', label: 'Date & Time', type: 'String' },
  { key: 'Transaction_Amount', label: 'Transaction Amount', type: 'Number' },
  { key: 'Transaction_Id', label: 'Transaction ID', type: 'String' },
  { key: 'RRN', label: 'RRN', type: 'String' },
]

// Convert YYYY-MM-DD → DD/MM/YYYY (API expected format)
function formatDateForApi(dateValue) {
  if (!dateValue) {
    return ''
  }

  const [year, month, day] = dateValue.split('-')
  if (!year || !month || !day) {
    return ''
  }

  return `${day}/${month}/${year}`
}

// Get today's date in input[type=date] format
function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format Date object → YYYY-MM-DD
function formatInputDate(dateValue) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get start & end date for selected month (current year)
function getMonthDateRange(monthName) {
  const monthIndex = monthlyOptions.indexOf(monthName)

  if (monthIndex < 0) {
    return null
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const isCurrentMonth = monthIndex === today.getMonth()

  return {
    startDate: formatInputDate(new Date(currentYear, monthIndex, 1)),
    endDate: isCurrentMonth
      ? formatInputDate(today)
      : formatInputDate(new Date(currentYear, monthIndex + 1, 0)),
  }
}

function isFutureDate(dateValue) {
  if (!dateValue) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate = new Date(dateValue)
  selectedDate.setHours(0, 0, 0, 0)

  return selectedDate > today
}

function normalizeReportStatusValue(value) {
  return String(value ?? '').trim().toUpperCase()
}

function isReportRunning(statusRecord) {
  const statusValue = normalizeReportStatusValue(statusRecord?.status)
  return statusValue === 'RUNNING' || statusValue === 'PROCESSING' || statusValue === 'PENDING'
}

function isReportComplete(statusRecord) {
  const statusValue = normalizeReportStatusValue(statusRecord?.status)
  return (
    statusValue === 'COMPLETED' ||
    statusValue === 'COMPLETE' ||
    statusValue === 'READY' ||
    Boolean(statusRecord?.signed_url)
  )
}

// Fetch user details from sessionStorage and normalize structure
function getStoredUserDetailsRecord() {
  const selectedProfile = storage.getSelectedProfile()

  if (selectedProfile?.vpa_id) {
    return selectedProfile
  }

  const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)

  if (!storedUserDetails) {
    return null
  }

  try {
    const parsedUserDetails = JSON.parse(storedUserDetails)

    if (Array.isArray(parsedUserDetails)) {
      return parsedUserDetails[0] ?? null
    }

    if (parsedUserDetails?.data && Array.isArray(parsedUserDetails.data)) {
      return parsedUserDetails.data[0] ?? null
    }

    return parsedUserDetails
  } catch (error) {
    console.error('[Reports] Failed to parse stored user details', error)
    return null
  }
}

// Ensure rows is always an array
function normalizeReportRows(rows) {
  return Array.isArray(rows) ? rows : []
}

// Extract meaningful error message
function getErrorMessage(error, fallbackMessage) {
  return error?.statusDescription || error?.message || fallbackMessage
}

function escapeCsvCell(value) {
  return String(value ?? '').replace(/"/g, '""')
}

function formatCsvCell(value, type) {
  const normalizedValue = String(value ?? '-')

  if (type === 'String') {
    return `"=""${escapeCsvCell(normalizedValue)}"""`
  }

  return `"${escapeCsvCell(normalizedValue)}"`
}

// Download report as CSV so Excel opens it directly without extension mismatch warnings.
function downloadReportRowsAsExcel(rows) {
  if (!rows.length) {
    return false
  }

  const headerRow = excelExportColumns
    .map((column) => `"${escapeCsvCell(column.label)}"`)
    .join(',')

  const dataRows = rows
    .map(
      (row, index) =>
        excelExportColumns
          .map((column) => {
            const cellValue =
              column.key === 'serialNumber' ? index + 1 : row?.[column.key] ?? '-'
            return formatCsvCell(cellValue, column.type)
          })
          .join(','),
    )
    .join('\r\n')

  const csvContent = `\uFEFF${headerRow}\r\n${dataRows}`

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  const downloadUrl = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = 'cboi-reports.csv'

  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)

  window.URL.revokeObjectURL(downloadUrl)
  return true
}

export function ReportsPage() {
  // Initial values
  const todayInputValue = useMemo(() => getTodayInputValue(), [])
  const currentMonthIndex = useMemo(() => new Date().getMonth(), [])

  // Filter states
  const [filterType, setFilterType] = useState('custom')
  const [searchValue, setSearchValue] = useState('')
  const [monthlySelection, setMonthlySelection] = useState(monthlyOptions[0])

  // Pagination states
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [goToPageInput, setGoToPageInput] = useState('1')

  // Date filters
  const [startDate, setStartDate] = useState(todayInputValue)
  const [endDate, setEndDate] = useState(todayInputValue)

  // API response states
  const [reportResponse, setReportResponse] = useState(null)
  const [reportStatus, setReportStatus] = useState(null)
  const [reportQueryId, setReportQueryId] = useState('')
  const [isPollingReportStatus, setIsPollingReportStatus] = useState(false)
  const [reportRows, setReportRows] = useState([])
  const [isFetchingReports, setIsFetchingReports] = useState(false)

  // Snackbar
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'danger',
  })

  // -----------------------------
  // Fetch Reports
  // -----------------------------
  const loadReports = async ({ nextStartDate, nextEndDate, mode }) => {
    const userDetailsRecord = getStoredUserDetailsRecord()
    const vpaId = userDetailsRecord?.vpa_id ?? ''

    if (!vpaId) {
      setReportResponse(null)
      setReportStatus(null)
      setReportQueryId('')
      setIsPollingReportStatus(false)
      setReportRows([])
      setSnackbarState({
        open: true,
        message: 'Unable to fetch reports',
        autoClose: true,
        colorType: 'danger',
      })
      return
    }

    try {
      setIsFetchingReports(true)

      const response = await submitTransactionReportQuery({
        startDate: formatDateForApi(nextStartDate),
        endDate: formatDateForApi(nextEndDate),
        vpa_id: vpaId,
        mode,
      })

      console.log('[Reports] querysubmit_username response', response)
      setReportResponse(response)

      if (mode === 'excel') {
        setReportRows([])

        if (response?.query_id) {
          setReportQueryId(response.query_id)
          try {
            const statusResponse = await getReportStatus(response.query_id)
            console.log('[Reports] get_report_status response', statusResponse)
            const nextStatus = statusResponse?.data ?? statusResponse
            setReportStatus(nextStatus)
            setIsPollingReportStatus(isReportRunning(nextStatus))
          } catch (statusError) {
            console.error('[Reports] Failed to fetch report status', statusError)
            setReportStatus(null)
            setIsPollingReportStatus(true)
          }
        }

        setSnackbarState({
          open: true,
          message: response?.statusDescription || 'Report submission successful',
          autoClose: true,
          colorType: 'success',
        })
      } else {
        setReportStatus(null)
        setReportQueryId('')
        setIsPollingReportStatus(false)
        setReportRows(normalizeReportRows(response?.data))
      }

      // Reset pagination
      setCurrentPage(1)
      setGoToPageInput('1')
    } catch (error) {
      console.error('[Reports] Failed to fetch reports', error)
      setReportResponse(null)
      setReportStatus(null)
      setReportQueryId('')
      setIsPollingReportStatus(false)
      setReportRows([])
      setSnackbarState({
        open: true,
        message: getErrorMessage(error, 'Unable to fetch reports'),
        autoClose: true,
        colorType: 'danger',
      })
    } finally {
      setIsFetchingReports(false)
    }
  }

  // Auto-fetch for "Today"
  useEffect(() => {
    if (filterType !== 'today') {
      return
    }

    setStartDate(todayInputValue)
    setEndDate(todayInputValue)

    loadReports({
      nextStartDate: todayInputValue,
      nextEndDate: todayInputValue,
      mode: 'both',
    })
  }, [filterType, todayInputValue])

  useEffect(() => {
    if (!reportQueryId || !isPollingReportStatus) {
      return undefined
    }

    const intervalId = window.setInterval(async () => {
      try {
        const statusResponse = await getReportStatus(reportQueryId)
        console.log('[Reports] get_report_status polling response', statusResponse)
        const nextStatus = statusResponse?.data ?? statusResponse
        setReportStatus(nextStatus)

        if (isReportComplete(nextStatus)) {
          setIsPollingReportStatus(false)
          setSnackbarState({
            open: true,
            message: 'Report completed. Download is ready.',
            autoClose: true,
            colorType: 'success',
          })
        } else if (!isReportRunning(nextStatus)) {
          setIsPollingReportStatus(false)
        }
      } catch (error) {
        console.error('[Reports] Failed to poll report status', error)
      }
    }, 10000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isPollingReportStatus, reportQueryId])

  // Search filtering
  const filteredRows = useMemo(() => {
    const term = searchValue.trim().toLowerCase()

    if (!term) {
      return reportRows
    }

    return reportRows.filter((row) =>
      reportColumns.some(({ key }) => String(row?.[key] ?? '').toLowerCase().includes(term)),
    )
  }, [reportRows, searchValue])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, rowsPerPage, reportRows])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      return
    }

    setGoToPageInput(String(currentPage))
  }, [currentPage, totalPages])

  // Get current page rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredRows.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredRows, rowsPerPage])

  // Pagination UI logic
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', totalPages]
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, 'ellipsis-left', currentPage, 'ellipsis-right', totalPages]
  }, [currentPage, totalPages])

  // -----------------------------
  // Handlers
  // -----------------------------
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) {
      return
    }

    setCurrentPage(page)
  }

  const handleGoToPageBlur = () => {
    const nextPage = Number(goToPageInput)

    if (Number.isNaN(nextPage)) {
      setGoToPageInput(String(currentPage))
      return
    }

    handlePageChange(nextPage)
  }

  const handleCustomSubmit = () => {
    if (!startDate || !endDate) {
      setSnackbarState({
        open: true,
        message: 'Select both start date and end date',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    if (isFutureDate(startDate) || isFutureDate(endDate)) {
      setSnackbarState({
        open: true,
        message: 'Start date and end date cannot be in the future',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setSnackbarState({
        open: true,
        message: 'Start date cannot be greater than end date',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    loadReports({
      nextStartDate: startDate,
      nextEndDate: endDate,
      mode: 'excel',
    })
  }

  const handleMonthlySubmit = () => {
    const monthDateRange = getMonthDateRange(monthlySelection)

    if (!monthDateRange) {
      setSnackbarState({
        open: true,
        message: 'Select a valid month',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    setStartDate(monthDateRange.startDate)
    setEndDate(monthDateRange.endDate)

    loadReports({
      nextStartDate: monthDateRange.startDate,
      nextEndDate: monthDateRange.endDate,
      mode: 'excel',
    })
  }

  const handleDownloadAll = () => {
    if (reportStatus?.signed_url) {
      const downloadLink = document.createElement('a')
      downloadLink.href = reportStatus.signed_url
      downloadLink.download = 'cboi-reports.xlsx'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      return
    }

    if (reportResponse?.query_id && !reportStatus?.signed_url) {
      setSnackbarState({
        open: true,
        message: isPollingReportStatus
          ? 'Report is still running. Download will be enabled when completed.'
          : 'Report is submitted. Download link is not ready yet.',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    const hasDownloaded = downloadReportRowsAsExcel(reportRows)

    if (!hasDownloaded) {
      setSnackbarState({
        open: true,
        message: 'No report data available to download',
        autoClose: true,
        colorType: 'warning',
      })
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    // UI remains unchanged (only comments added above)
    <section className="portal-section reports-page">
          {/* Loader for API calls */}
      <LoaderOverlay open={isFetchingReports} text="CBOI Loading........" />

      {/* Snackbar for error/warning messages */}
      <Snackbar
        open={snackbarState.open}
        message={snackbarState.message}
        autoClose={snackbarState.autoClose}
        colorType={snackbarState.colorType}
        onClose={() =>
          setSnackbarState((current) => ({
            ...current,
            open: false,
          }))
        }
      />

      <h1 className="portal-section__title">Transaction Reports</h1>

      {/* -----------------------------
          Filter Section (Today / Monthly / Custom)
      ----------------------------- */}
      <div className="reports-filter-card">
        <p className="reports-filter-card__label">Select a Report Filter</p>

        {/* Radio buttons for filter selection */}
        <div className="reports-filter-card__options">
          <label className="reports-radio">
            <input
              checked={filterType === 'today'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('today')}
            />
            <span>Today</span>
          </label>

          <label className="reports-radio">
            <input
              checked={filterType === 'monthly'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('monthly')}
            />
            <span>Monthly</span>
          </label>

          <label className="reports-radio">
            <input
              checked={filterType === 'custom'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('custom')}
            />
            <span>Custom Range</span>
          </label>
        </div>

        {/* Show controls only if NOT "Today" */}
        {filterType !== 'today' ? (
          <div className="reports-filter-card__controls">

            {/* Monthly dropdown */}
            {filterType === 'monthly' ? (
              <label className="reports-input-group reports-input-group--wide">
                <span>Monthly Range</span>
                <select
                  value={monthlySelection}
                  onChange={(event) => setMonthlySelection(event.target.value)}
                >
                  {monthlyOptions.map((option, index) => (
                    <option key={option} value={option} disabled={index > currentMonthIndex}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                {/* Custom Date Range */}
                <label className="reports-input-group">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>

                <label className="reports-input-group">
                  <span>End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </>
            )}

            {/* Submit button */}
            <button
              className="reports-action-button"
              type="button"
              onClick={
                filterType === 'custom'
                  ? handleCustomSubmit
                  : filterType === 'monthly'
                    ? handleMonthlySubmit
                    : undefined
              }
              disabled={filterType !== 'custom' && filterType !== 'monthly'}
            >
              Submit
            </button>
          </div>
        ) : null}
      </div>

      {/* -----------------------------
          Table Section
      ----------------------------- */}
      <div className="reports-table-card">

        {/* Toolbar (Search + Summary + Download) */}
        <div className="reports-table-card__toolbar">
          <label className="reports-search">
            <input
              type="search"
              placeholder="Search here..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          {/* Summary info */}
          <div className="reports-summary">
            <span>Rows: {reportResponse?.row_count ?? reportRows.length}</span>
            <span>Total Amount: {reportResponse?.total_amount ?? 0}</span>
            {reportQueryId ? (
              <span>
                Report Status:{' '}
                {isPollingReportStatus
                  ? 'Running'
                  : reportStatus?.signed_url
                    ? 'Completed'
                    : reportStatus?.status ?? 'Submitted'}
              </span>
            ) : null}

            {/* Download all rows */}
            <button
              className="reports-action-button reports-action-button--small"
              type="button"
              onClick={handleDownloadAll}
              disabled={Boolean(reportQueryId) && !reportStatus?.signed_url}
            >
              {isPollingReportStatus ? 'Preparing...' : 'Download All'}
            </button>
          </div>
        </div>

        {/* Table Wrapper */}
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                {/* Serial Number Column */}
                <th>S. No.</th>

                {/* Dynamic columns */}
                {reportColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length ? (
                paginatedRows.map((row, index) => (
                  <tr key={`${row.Transaction_Id ?? 'row'}-${index}`}>
                    {/* Serial Number */}
                    <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>

                    {/* Row Data */}
                    {reportColumns.map((column) => (
                      <td key={column.key}>{String(row?.[column.key] ?? '-')}</td>
                    ))}
                  </tr>
                ))
              ) : (
                // Empty State
                <tr>
                  <td colSpan={reportColumns.length + 1} className="reports-table__empty">
                    No report data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* -----------------------------
            Pagination Section
        ----------------------------- */}
        <div className="reports-table-card__footer">

          {/* Pagination Controls */}
          <div className="reports-table-card__meta">
            <span>Row per page</span>

            {/* Rows per page selector */}
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>

            {/* Go to page input */}
            <span>Go to</span>
            <input
              type="text"
              value={goToPageInput}
              onChange={(event) => setGoToPageInput(event.target.value)}
              onBlur={handleGoToPageBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleGoToPageBlur()
                }
              }}
            />
          </div>

          {/* Pagination Buttons */}
          <div className="reports-pagination">
            {/* Previous Button */}
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </button>

            {/* Page Numbers */}
            {paginationItems.map((item, index) =>
              typeof item === 'number' ? (
                <button
                  key={`${item}-${index}`}
                  className={item === currentPage ? 'is-active' : ''}
                  type="button"
                  onClick={() => handlePageChange(item)}
                >
                  {item}
                </button>
              ) : (
                <span key={`${item}-${index}`}>...</span>
              ),
            )}

            {/* Next Button */}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

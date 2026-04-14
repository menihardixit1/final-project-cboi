import { useCallback, useEffect, useMemo, useState } from 'react'
import { authStorageKeys } from '../../config/authConfig'
import { StatCard } from '../../components/portal/StatCard'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'
import { submitTransactionReportQuery } from '../../services/reportApi'
import { fetchByMobileNumber, normalizeUserProfiles } from '../../services/userApi'
import { storage } from '../../utils/storage'
import VpaSelectionModal from '../../components/dashboard/VpaSelectionModal'
import '../../components/portal/styles/DashboardPage.css'

function TransactionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10" />
      <path d="m14 4 3 3-3 3" />
      <path d="M17 17H7" />
      <path d="m10 14-3 3 3 3" />
    </svg>
  )
}

function AmountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h12" />
      <path d="M8 9h8" />
      <path d="M9 5c3 2.5 3 7.5 0 10" />
      <path d="M8 15h8" />
    </svg>
  )
}

const dateFilterOptions = ['Today', 'Yesterday']

function formatDateForApi(dateValue) {
  const day = String(dateValue.getDate()).padStart(2, '0')
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const year = dateValue.getFullYear()
  return `${day}/${month}/${year}`
}

function getDashboardDateRange(filter) {
  const targetDate = new Date()

  if (filter === 'Yesterday') {
    targetDate.setDate(targetDate.getDate() - 1)
  }

  const formattedDate = formatDateForApi(targetDate)

  return {
    startDate: formattedDate,
    endDate: formattedDate,
  }
}

function formatAmount(value) {
  const numericValue = Number(value || 0)
  return numericValue.toLocaleString('en-IN')
}

function getNumericAmount(value) {
  const normalizedValue = String(value ?? '0').replace(/,/g, '')
  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function hasSelectedProfile(profiles, selectedProfile) {
  return Boolean(
    selectedProfile?.vpa_id &&
      profiles.some((profile) => profile.vpa_id === selectedProfile.vpa_id),
  )
}

let shouldPromptForDashboardVpa = true

export function DashboardPage() {
  const [isFetchingUserDetails, setIsFetchingUserDetails] = useState(false)
  const [isFetchingDashboard, setIsFetchingDashboard] = useState(false)
  const [profileList, setProfileList] = useState(() => storage.getProfileList())
  const [selectedProfile, setSelectedProfile] = useState(() => storage.getSelectedProfile())
  const [showVpaModal, setShowVpaModal] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState('Today')
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [dashboardSummary, setDashboardSummary] = useState({
    transactionCount: 0,
    totalAmount: 0,
  })
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'danger',
  })

  const stats = useMemo(
    () => [
      {
        label: 'Total No Of Transaction',
        value: String(dashboardSummary.transactionCount),
        icon: <TransactionIcon />,
      },
      {
        label: 'Total Amount',
        value: formatAmount(dashboardSummary.totalAmount),
        icon: <AmountIcon />,
      },
    ],
    [dashboardSummary],
  )

  const loadDashboardSummary = useCallback(
    async (profile, dateFilter = selectedDateFilter) => {
      const vpaId = profile?.vpa_id

      if (!vpaId) {
        setDashboardSummary({
          transactionCount: 0,
          totalAmount: 0,
        })
        return
      }

      try {
        setIsFetchingDashboard(true)
        const dateRange = getDashboardDateRange(dateFilter)
        const response = await submitTransactionReportQuery({
          ...dateRange,
          vpa_id: vpaId,
          mode: 'both',
        })
        const rows = Array.isArray(response?.data) ? response.data : []
        const totalAmount =
          response?.total_amount ??
          rows.reduce(
            (sum, row) => sum + getNumericAmount(row?.Transaction_Amount),
            0,
          )

        setDashboardSummary({
          transactionCount: response?.row_count ?? rows.length,
          totalAmount,
        })
      } catch (error) {
        console.error('[Dashboard] Failed to fetch dashboard summary', error)
        setDashboardSummary({
          transactionCount: 0,
          totalAmount: 0,
        })
        setSnackbarState({
          open: true,
          message: error?.message || 'Unable to fetch dashboard data',
          autoClose: true,
          colorType: 'danger',
        })
      } finally {
        setIsFetchingDashboard(false)
      }
    },
    [selectedDateFilter],
  )

  useEffect(() => {
    let isMounted = true

    const fetchUserDetails = async () => {
      const shouldFetchAfterRedirect =
        window.sessionStorage.getItem(authStorageKeys.userDetailsFetchPending) === 'true'

      if (!shouldFetchAfterRedirect) {
        const latestProfiles = storage.getProfileList()

        if (shouldPromptForDashboardVpa && latestProfiles.length > 0) {
          storage.clearSelectedProfile()
          shouldPromptForDashboardVpa = false
          setProfileList(latestProfiles)
          setSelectedProfile({})
          setDashboardSummary({
            transactionCount: 0,
            totalAmount: 0,
          })
          setShowVpaModal(true)
          return
        }

        const latestSelectedProfile = storage.getSelectedProfile()
        const hasValidSelection = hasSelectedProfile(latestProfiles, latestSelectedProfile)
        setProfileList(latestProfiles)
        setSelectedProfile(hasValidSelection ? latestSelectedProfile : {})
        setShowVpaModal(latestProfiles.length > 0 && !hasValidSelection)

        if (hasValidSelection) {
          loadDashboardSummary(latestSelectedProfile)
        }
        return
      }

      const storedProfile = window.sessionStorage.getItem(authStorageKeys.oidcProfile)
      const profileData = storedProfile ? JSON.parse(storedProfile) : null
      const mobileNumber = profileData?.user_name ?? ''

      if (!mobileNumber) {
        window.sessionStorage.removeItem(authStorageKeys.userDetailsFetchPending)
        return
      }

      try {
        if (isMounted) {
          setIsFetchingUserDetails(true)
        }

        const response = await fetchByMobileNumber(mobileNumber)
        const profiles = normalizeUserProfiles(response)

        if (!isMounted) {
          return
        }

        window.sessionStorage.setItem(authStorageKeys.userDetails, JSON.stringify(response))
        window.sessionStorage.removeItem(authStorageKeys.userDetailsFetchPending)
        storage.setProfileList(profiles)
        storage.clearSelectedProfile()
        shouldPromptForDashboardVpa = false
        setProfileList(profiles)

        setSelectedProfile({})
        setShowVpaModal(profiles.length > 0)
      } catch (error) {
        console.error('[Dashboard] Failed to fetch user details', error)
        window.sessionStorage.removeItem(authStorageKeys.userDetailsFetchPending)
      } finally {
        if (isMounted) {
          setIsFetchingUserDetails(false)
        }
      }
    }

    fetchUserDetails()

    return () => {
      isMounted = false
    }
  }, [loadDashboardSummary, profileList.length, selectedProfile?.vpa_id])

  const handleProceed = (profile) => {
    storage.setSelectedProfile(profile)
    setSelectedProfile(profile)
    setShowVpaModal(false)
    loadDashboardSummary(profile)
  }

  const handleDateFilterChange = (nextFilter) => {
    setSelectedDateFilter(nextFilter)
    setIsDateFilterOpen(false)
    loadDashboardSummary(selectedProfile, nextFilter)
  }

  const handleCancel = () => {
    storage.clearAllSession()
    window.location.href = '/'
  }

  return (
    <section className="portal-section">
      <LoaderOverlay
        open={isFetchingUserDetails || isFetchingDashboard}
        text="CBOI Loading........"
      />

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

      <div className="dashboard-header">
        <div>
          <h1 className="portal-section__title">Dashboard</h1>
          <p className="dashboard-header__vpa">ID : {selectedProfile?.vpa_id || '-'}</p>
        </div>

        <div className="dashboard-filter">
          <button
            className="dashboard-filter__button"
            type="button"
            onClick={() => setIsDateFilterOpen((current) => !current)}
            disabled={!selectedProfile?.vpa_id}
          >
            <span>{selectedDateFilter}</span>
            <span aria-hidden="true">v</span>
          </button>

          {isDateFilterOpen ? (
            <div className="dashboard-filter__menu">
              {dateFilterOptions.map((option) => (
                <label className="dashboard-filter__option" key={option}>
                  <input
                    type="radio"
                    checked={selectedDateFilter === option}
                    onChange={() => handleDateFilterChange(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <StatCard
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>

      <VpaSelectionModal
        open={showVpaModal}
        profiles={profileList}
        onCancel={handleCancel}
        onProceed={handleProceed}
      />
    </section>
  )
}

export default DashboardPage

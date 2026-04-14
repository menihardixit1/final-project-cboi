import { useState } from 'react'

function getProfileLabel(profile) {
  return (
    profile?.merchant_name ??
    profile?.merchantName ??
    profile?.name ??
    profile?.adminName ??
    profile?.vpa_id ??
    'Merchant profile'
  )
}

export default function VpaSelectionModal({ open, profiles = [], onCancel, onProceed }) {
  const [selectedVpa, setSelectedVpa] = useState('')
  const firstVpa = profiles[0]?.vpa_id || ''
  const activeVpa = selectedVpa || firstVpa
  const selectedProfile = profiles.find((item) => item.vpa_id === activeVpa)

  const handleProceed = () => {
    if (selectedProfile) {
      onProceed(selectedProfile)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="profile-details-modal-overlay"
      role="presentation"
    >
      <div
        className="profile-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vpa-selection-title"
      >
        <div className="profile-details-modal__header">
          <h2 id="vpa-selection-title">Select VPA</h2>
        </div>

        <div className="profile-details-modal__body">
          <section className="profile-details-section">
            <h3>Select a VPA to Proceed</h3>

            <div className="profile-details-grid">
              {profiles.length ? (
                profiles.map((profile) => (
                  <label
                    className="profile-details-grid__pair vpa-selection-option"
                    key={`${profile?.vpa_id}-${profile?.serial_number ?? ''}`}
                  >
                    <input
                      type="radio"
                      name="selected_vpa"
                      checked={activeVpa === profile.vpa_id}
                      onChange={() => setSelectedVpa(profile.vpa_id)}
                    />
                    <span>{getProfileLabel(profile)}</span>
                    <strong>{profile?.vpa_id ?? '-'}</strong>
                  </label>
                ))
              ) : (
                <div className="profile-details-grid__pair">
                  <span>Message</span>
                  <strong>No VPA profiles available.</strong>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="profile-details-modal__footer">
          <button
            className="profile-details-modal__button"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="profile-details-modal__button profile-details-modal__button--primary"
            type="button"
            onClick={handleProceed}
            disabled={!selectedProfile}
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
}

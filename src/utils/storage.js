import { authStorageKeys } from '../config/authConfig'

const keys = {
  token: 'token',
  idToken: 'id_token',
  profileList: 'profile_list',
  selectedProfile: 'selected_profile',
}

const legacySelectedProfileKey = 'cboi-selected-profile'

function parseJson(value) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch (error) {
    console.error('[Storage] Failed to parse cached JSON', error)
    return null
  }
}

function normalizeProfiles(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(value.data)) {
    return value.data
  }

  if (value.data && typeof value.data === 'object') {
    return [value.data]
  }

  if (typeof value === 'object') {
    return [value]
  }

  return []
}

export const storage = {
  getToken() {
    const storedSession =
      window.sessionStorage.getItem(authStorageKeys.session) ??
      window.localStorage.getItem(authStorageKeys.local)
    const session = parseJson(storedSession)

    return window.localStorage.getItem(keys.token) || session?.accessToken || ''
  },

  setToken(token) {
    window.localStorage.setItem(keys.token, token)
  },

  getIdToken() {
    return window.localStorage.getItem(keys.idToken) || ''
  },

  setIdToken(token) {
    window.localStorage.setItem(keys.idToken, token)
  },

  setProfileList(profiles) {
    window.localStorage.setItem(keys.profileList, JSON.stringify(profiles || []))
  },

  getProfileList() {
    const storedProfiles = normalizeProfiles(parseJson(window.localStorage.getItem(keys.profileList)))

    if (storedProfiles.length) {
      return storedProfiles
    }

    const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)
    return normalizeProfiles(parseJson(storedUserDetails))
  },

  getSelectedProfile() {
    const selectedProfile =
      parseJson(window.localStorage.getItem(keys.selectedProfile)) ??
      parseJson(window.sessionStorage.getItem(legacySelectedProfileKey))

    if (selectedProfile?.vpa_id) {
      return selectedProfile
    }

    return {}
  },

  setSelectedProfile(profile) {
    window.localStorage.setItem(keys.selectedProfile, JSON.stringify(profile || {}))
    window.sessionStorage.setItem(legacySelectedProfileKey, JSON.stringify(profile || {}))
  },

  clearSelectedProfile() {
    window.localStorage.removeItem(keys.selectedProfile)
    window.sessionStorage.removeItem(legacySelectedProfileKey)
  },

  clearAllSession() {
    window.sessionStorage.clear()
    window.localStorage.removeItem(authStorageKeys.local)
    window.localStorage.removeItem(keys.token)
    window.localStorage.removeItem(keys.idToken)
    window.localStorage.removeItem(keys.profileList)
    window.localStorage.removeItem(keys.selectedProfile)
  },
}

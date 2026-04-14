import { apiConfig } from '../config/apiConfig'
import { getAuthorizationHeader } from './authService'
import { apiRequest } from './apiClient'

const supportedLanguages = ['HINDI', 'ENGLISH', 'TAMIL', 'TELUGU', 'KANNADA', 'MALAYALAM', 'MARATHI']

function normalizeLanguageValue(value) {
  return value ? String(value).trim().toUpperCase() : ''
}

function normalizeLanguageLabel(value) {
  if (!value) {
    return ''
  }

  const lower = String(value).trim().toLowerCase()
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
}

function buildLanguageUrl(endpoint) {
  return /^https?:\/\//.test(endpoint) ? endpoint : `${apiConfig.reportBaseUrl}${endpoint}`
}

function isStatusUpdateEndpoint(endpoint) {
  return String(endpoint).includes('/status_update')
}

function assertSuccessfulResponse(responseData) {
  const responseCode = String(responseData?.responseCode ?? '')
  const result = String(responseData?.result ?? '').toLowerCase()

  if (result === 'failed' || (responseCode && responseCode !== '00')) {
    throw new Error(responseData?.message || 'Language status update failed.')
  }
}

export function getProfileCurrentLanguage(profile) {
  const rawValue =
    profile?.current_language ??
    profile?.language ??
    profile?.delete_language ??
    profile?.soundbox_language ??
    ''

  return {
    label: normalizeLanguageLabel(rawValue),
    value: normalizeLanguageValue(rawValue),
  }
}

export async function fetchAvailableLanguages() {
  return supportedLanguages.map((language) => ({
    label: normalizeLanguageLabel(language),
    value: normalizeLanguageValue(language),
  }))
}

export async function fetchCurrentLanguage(serialNumber, profile = {}) {
  if (!serialNumber) {
    throw new Error('Serial number is required to fetch current language.')
  }

  try {
    const response = await apiRequest(`${apiConfig.currentLanguageEndpoint}/${serialNumber}`, {
      method: 'GET',
    })
    const rawValue =
      response?.data?.current_language ??
      response?.data?.language ??
      response?.current_language ??
      response?.language ??
      response?.result?.current_language ??
      response?.result?.language ??
      response?.data ??
      response ??
      ''

    return {
      label: normalizeLanguageLabel(rawValue),
      value: normalizeLanguageValue(rawValue),
    }
  } catch (error) {
    const fallbackLanguage = getProfileCurrentLanguage(profile)

    if (fallbackLanguage.value) {
      return fallbackLanguage
    }

    throw error
  }
}

export async function updateLanguage({
  tid,
  delete_language,
  update_language,
  status = 'ACTIVE',
  errorDesc = '',
}) {
  if (!tid) {
    throw new Error('Serial number is required to update language.')
  }

  if (!delete_language) {
    throw new Error('Current language is required to update language.')
  }

  if (!update_language) {
    throw new Error('Language update is required.')
  }

  const response = await fetch(buildLanguageUrl(apiConfig.updateLanguageEndpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: JSON.stringify(
      isStatusUpdateEndpoint(apiConfig.updateLanguageEndpoint)
        ? {
            key: 'lang_update',
            message: {
              column2: String(tid),
              column3: '',
              column6: '',
              column7: normalizeLanguageValue(delete_language),
              column8: normalizeLanguageValue(update_language),
              column9: status,
              column10: errorDesc,
            },
          }
        : {
            tid: String(tid),
            update_language: normalizeLanguageValue(update_language),
          },
    ),
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(responseData?.message || `Language update failed with status ${response.status}`)
  }

  assertSuccessfulResponse(responseData)
  return responseData
}

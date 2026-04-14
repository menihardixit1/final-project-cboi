import { apiConfig } from '../config/apiConfig'
import { apiRequest } from './apiClient'

export async function fetchByMobileNumber(mobileNumber) {
  if (!mobileNumber) {
    throw new Error('Mobile number is required to fetch user details.')
  }

  return apiRequest(apiConfig.fetchUserDetailsEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      mobile_number: mobileNumber,
    }),
  })
}

export function normalizeUserProfiles(response) {
  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response)) {
    return response
  }

  return response ? [response] : []
}

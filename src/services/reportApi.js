import { apiConfig } from '../config/apiConfig'
import { getAuthorizationHeader } from './authService'

function buildReportUrl(endpoint) {
  return /^https?:\/\//.test(endpoint) ? endpoint : `${apiConfig.reportBaseUrl}${endpoint}`
}

async function parseJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid server response format.')
  }
}

async function handleErrorResponse(response) {
  const payload = await parseJsonResponse(response).catch(() => ({}))
  const message =
    payload?.statusDescription ||
    payload?.message ||
    payload?.error ||
    `Request failed with status ${response.status}`

  throw new Error(message)
}

function assertSuccessfulPayload(payload) {
  if (
    payload?.status === 'FAILED' ||
    payload?.statusCode === -1 ||
    payload?.statusCode === 1
  ) {
    throw new Error(
      payload?.statusDescription ||
        payload?.message ||
        payload?.error ||
        'Report request failed.',
    )
  }
}

export async function submitTransactionReportQuery(payload) {
  const response = await fetch(buildReportUrl(apiConfig.reportsQuerySubmitUserEndpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthorizationHeader(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    await handleErrorResponse(response)
  }

  const responseData = await parseJsonResponse(response)
  assertSuccessfulPayload(responseData)
  return responseData
}

export async function getReportStatus(queryId) {
  if (!queryId) {
    throw new Error('Query ID is required to fetch report status.')
  }

  const response = await fetch(
    buildReportUrl(`${apiConfig.reportsStatusEndpoint}/${encodeURIComponent(queryId)}`),
    {
      method: 'GET',
      headers: {
        ...getAuthorizationHeader(),
      },
    },
  )

  if (!response.ok) {
    await handleErrorResponse(response)
  }

  const responseData = await parseJsonResponse(response)
  assertSuccessfulPayload(responseData)
  return responseData
}

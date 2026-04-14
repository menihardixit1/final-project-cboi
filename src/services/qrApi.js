import { apiConfig } from '../config/apiConfig'
import { apiRequest } from './apiClient'

export async function convertQrToBase64(qrString) {
  if (!qrString) {
    throw new Error('QR string is required.')
  }

  return apiRequest(apiConfig.staticQrEndpoint, {
    method: 'POST',
    body: JSON.stringify({ qrString }),
  })
}

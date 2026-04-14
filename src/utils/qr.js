export function buildDynamicQrString({ baseQrString, amount }) {
  if (!baseQrString) {
    throw new Error('Base QR string not found.')
  }

  const parsedAmount = String(amount ?? '').trim()

  if (!parsedAmount || Number(parsedAmount) <= 0) {
    throw new Error('Please enter a valid amount.')
  }

  const separator = baseQrString.includes('?') ? '&' : '?'

  if (/[?&]am=/.test(baseQrString)) {
    return baseQrString.replace(/([?&]am=)[^&]*/i, `$1${encodeURIComponent(parsedAmount)}`)
  }

  return `${baseQrString}${separator}am=${encodeURIComponent(parsedAmount)}`
}

export function getBase64ImageSrc(base64Image) {
  if (!base64Image) {
    return ''
  }

  return base64Image.startsWith('data:image') ? base64Image : `data:image/png;base64,${base64Image}`
}

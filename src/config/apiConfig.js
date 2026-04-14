export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  reportBaseUrl:
    import.meta.env.VITE_REPORT_BASE_URL ?? 'https://services-cboi-uat.isupay.in',
  fetchUserDetailsEndpoint:
    import.meta.env.VITE_FETCH_USER_DETAILS_ENDPOINT ?? '/CBOI/fetch/fetchById',
  reportsQuerySubmitUserEndpoint:
    import.meta.env.VITE_REPORTS_QUERY_SUBMIT_USER_ENDPOINT ??
    '/CBOI/reports/querysubmit_username',
  reportsStatusEndpoint:
    import.meta.env.VITE_REPORTS_STATUS_ENDPOINT ?? '/CBOI/reports/get_report_status',
  currentLanguageEndpoint:
    import.meta.env.VITE_CURRENT_LANGUAGE_ENDPOINT ?? '/CBOI/isu_soundbox/user_api/current_language',
  fetchLanguageEndpoint:
    import.meta.env.VITE_FETCH_LANGUAGE_ENDPOINT ?? '/CBOI/isu_soundbox/lang/status_update',
  updateLanguageEndpoint:
    import.meta.env.VITE_UPDATE_LANGUAGE_ENDPOINT ?? '/CBOI/isu_soundbox/lang/status_update',
  staticQrEndpoint:
    import.meta.env.VITE_STATIC_QR_ENDPOINT ?? '/CBOI/merchant/qr_convert_to_base64',
  userDetailsSerialNumber:
    import.meta.env.VITE_USER_DETAILS_SERIAL_NUMBER ?? '38241108350403',
  staticAuthorizationToken: import.meta.env.VITE_STATIC_AUTH_TOKEN ?? '',
  // authorizationScheme: import.meta.env.VITE_STATIC_AUTH_SCHEME ?? 'Bearer',
  staticPassKey: import.meta.env.VITE_STATIC_PASS_KEY ?? '',
  passKeyHeader: import.meta.env.VITE_PASS_KEY_HEADER ?? 'pass_key',
  passKeyStorageKey: 'cboi-pass-key',
}

export function getStaticAuthorizationHeader() {
  if (!apiConfig.staticAuthorizationToken) {
    return {}
  }

  const headerValue = apiConfig.authorizationScheme
    ? `${apiConfig.authorizationScheme} ${apiConfig.staticAuthorizationToken}`
    : apiConfig.staticAuthorizationToken

  return {
    Authorization: headerValue,
  }
}

export function getStaticPassKeyHeader() {
  const storedPassKey =
    window.sessionStorage.getItem(apiConfig.passKeyStorageKey) ?? apiConfig.staticPassKey

  if (!storedPassKey || !apiConfig.passKeyHeader) {
    return {}
  }

  return {
    [apiConfig.passKeyHeader]: storedPassKey,
  }
}

export function storePassKey(passKey) {
  if (!passKey) {
    window.sessionStorage.removeItem(apiConfig.passKeyStorageKey)
    return
  }

  window.sessionStorage.setItem(apiConfig.passKeyStorageKey, passKey)
}
  

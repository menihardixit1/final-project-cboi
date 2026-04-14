import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'oidc-react'
import './index.css'
import './index.css'
import App from './App.jsx'
import { storePassKey } from './config/apiConfig.js'
import { oidcConfig } from './config/oidcConfig.js'
import { authStorageKeys } from './config/authConfig.js'
import { logout as logoutUser, saveOidcUserSession } from './services/authService.js'
import { fetchByMobileNumber, normalizeUserProfiles } from './services/userApi.js'
import { storage } from './utils/storage.js'

storePassKey(import.meta.env.VITE_STATIC_PASS_KEY ?? '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider
      {...oidcConfig}
      autoSignIn={false}
      onSignIn={async (userData) => {
        saveOidcUserSession(userData, { persist: false })
        const mobileNumber = userData?.profile?.user_name ?? ''

        if (mobileNumber) {
          try {
            const response = await fetchByMobileNumber(mobileNumber)
            const profiles = normalizeUserProfiles(response)

            window.sessionStorage.setItem(authStorageKeys.userDetails, JSON.stringify(response))
            storage.setProfileList(profiles)
            storage.clearSelectedProfile()
            window.sessionStorage.removeItem(authStorageKeys.userDetailsFetchPending)
          } catch (error) {
            console.error('[OIDC] Failed to fetch VPA profiles after sign-in', error)
            window.sessionStorage.setItem(authStorageKeys.userDetailsFetchPending, 'true')
          }
        } else {
          window.sessionStorage.setItem(authStorageKeys.userDetailsFetchPending, 'true')
        }

        window.location.replace('/dashboard')
      }}
      onSignOut={() => {
        logoutUser()
        window.location.replace('/login')
      }}
      onSignInError={(error) => {
        console.error('[OIDC] Sign-in failed', error)
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

import { WebStorageStateStore } from 'oidc-react'

export const oidcConfig = {
authority: 'https://cboi-auth-stage.isupay.in/application/o/merchant-web-application/',
  clientId: '02WnEFxSElzxzrv3Qht29IacaiO6qKa3pclXleoo',
  redirectUri: `${window.location.origin}/callback`,
  postLogoutRedirectUri: `${window.location.origin}/sso/logout`,
  responseType: 'code',
  scope:
    'openid profile email offline_access authorities privileges user_name created adminName bankCode goauthentik.io/api',
  automaticSilentRenew: true,
  loadUserInfo: true,
  monitorSession: true,
  filterProtocolClaims: true,
  userStore: new WebStorageStateStore({
    store: window.sessionStorage,
    sync: true,
  }),
}

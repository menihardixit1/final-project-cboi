import { useEffect } from 'react'
import { useAuth } from 'oidc-react'
import bankLogo from '../assets/cboi.png'

export function LoginPage() {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.userData) {
      auth.signIn().catch(() => {})
    }
  }, [auth])

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Redirecting">
        <div className="login-card__body">
          <img className="login-card__logo" src={bankLogo} alt="CBOI Bank" />
          <h1 className="login-card__title">Redirecting To Secure Login</h1>
        </div>
      </section>
    </main>
  )
}

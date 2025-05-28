'use client'

import { useState, useEffect } from 'react'
import styles from './CookieBanner.module.css'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  // 1) On mount, check for existing consent cookie
  useEffect(() => {
    const hasConsent = document.cookie
      .split('; ')
      .some(item => item.startsWith('cookieConsent='))
    if (!hasConsent) setVisible(true)
  }, [])

  // 2) Write consent cookie & hide banner
  function acceptCookies() {
    document.cookie = [
      'cookieConsent=true',
      'path=/',
      `max-age=${60 * 60 * 24 * 365}`, // 1 year
    ].join('; ')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.banner}>
      <p className={styles.message}>
        We collect your name &amp; address to process orders. Payments are
        handled securely on Clover.
      </p>
      <button onClick={acceptCookies} className={styles.button}>
        Accept
      </button>
    </div>
  )
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSession }         from 'next-auth/react';            // ← new
import { useRouter, useSearchParams } from 'next/navigation';     // ← new

import LoginForm              from './LoginForm';
import SignupModal            from './SignupModal';
import ForgotPasswordModal    from './ForgotPasswordModal';
import styles                 from './Login.module.css';

const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || '/api/auth';

export default function Login() {
  const [isSignUpOpen, setIsSignUpOpen]     = useState(false);
  const [isForgotOpen, setIsForgotOpen]     = useState(false);

  // ─── next-auth session ───────────────────────────────────────────
  const { data: session, status } = useSession();
  const router                    = useRouter();
  const searchParams              = useSearchParams();
  const redirectTo                = searchParams.get("redirect");

  // ─── if already signed in, send them back immediately ────────────
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo || "/dashboard");
    }
  }, [status, redirectTo, router]);

  // ─── Escape key & scroll lock for modals ─────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSignUpOpen(false);
        setIsForgotOpen(false);
      }
    };
    if (isSignUpOpen || isForgotOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isSignUpOpen, isForgotOpen]);

  return (
    <div className={styles['auth-container']}>
      <div className={styles['auth-left']}>
        <h2>Welcome Back!</h2>
        <p>To stay connected, log in with your personal info or create an account.</p>
      </div>
      <div className={styles['auth-right']}>
        <div className={styles['form-container']}>
          <LoginForm
            onOpenForgotPassword={() => setIsForgotOpen(true)}
            onOpenSignup         ={() => setIsSignUpOpen(true)}
          />
        </div>
      </div>

      <SignupModal
        isOpen    ={isSignUpOpen}
        onClose   ={() => setIsSignUpOpen(false)}
        backendURL={backendURL}
      />

      <ForgotPasswordModal
        isOpen    ={isForgotOpen}
        onClose   ={() => setIsForgotOpen(false)}
        backendURL={backendURL}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { verifyOtp } from '../actions';
import styles from './page.module.css';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await verifyOtp(new FormData(e.target));
      if (result?.error) setError(result.error);
    } catch {
      // redirect 시 에러 발생 가능
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.subtitle}>Google Authenticator PIN을 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            name="pin"
            placeholder="6자리 PIN"
            className={styles.input}
            maxLength={6}
            pattern="[0-9]*"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
          />
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? '확인 중...' : '로그인'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

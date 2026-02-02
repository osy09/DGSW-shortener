// app/page.js
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { shortenUrl } from './actions';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import styles from './page.module.css';

export default function Home() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    const formData = new FormData(e.target);
    const response = await shortenUrl(formData);

    setIsLoading(false);

    if (response.error) {
      setError(response.error);
    } else {
      setResult(response);
    }
  };

  const handleCopy = async () => {
    if (!result?.shortUrl) return;

    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  return (
    <main className={styles.container}>
      {/* 왼쪽 상단 로고 */}
      <div className={styles.topLogo}>
        <Image src="/logo.png" alt="DGSW 로고" className={styles.topLogoImage} width={160} height={80} priority />
      </div>

      <header className={styles.header}>
        <h1 className={styles.logo}>DGSW.site</h1>
        <p className={styles.subtitle}>긴 URL을 짧고 깔끔하게</p>
      </header>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              name="url"
              placeholder="https://sangcheol.com/very-long-url"
              className={styles.input}
              autoComplete="off"
              autoFocus
            />
          </div>
          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? '단축 중...' : 'URL 단축하기'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {result && (
          <div className={styles.result}>
            <p className={styles.resultLabel}>단축된 URL</p>
            <div className={styles.resultContent}>
              <div className={styles.urlDisplay}>
                <span className={styles.shortUrl}>{result.shortUrl}</span>
                <button
                  onClick={handleCopy}
                  className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                >
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>

              <div className={styles.qrSection}>
                <span className={styles.qrLabel}>QR 코드</span>
                <QRCodeDisplay
                  url={result.shortUrl}
                  size={150}
                  className={styles.qrSection}
                  wrapperClassName={styles.qrWrapper}
                />
              </div>

              <p className={styles.originalUrl}>
                원본: {result.originalUrl.length > 60
                  ? result.originalUrl.substring(0, 60) + '...'
                  : result.originalUrl}
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p>
          Made by DGSW Students. Source code on {'osy'}
        </p>
      </footer>
    </main>
  );
}

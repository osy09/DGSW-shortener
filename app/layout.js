// app/layout.js

import './globals.css';

export const metadata = {
  title: 'DGSW URL Shortener',
  description: '긴 URL을 짧고 간편하게 단축하세요. QR 코드도 함께 제공됩니다.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

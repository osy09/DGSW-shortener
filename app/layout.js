import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'DGSW URL Shortener',
  description: '긴 URL을 짧고 간편하게 단축하세요. QR 코드도 함께 제공됩니다.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}

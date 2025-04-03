import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'テキスト読み上げアプリ',
  description: '簡単なテキスト読み上げアプリ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
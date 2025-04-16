import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin', 'latin-ext', 'cyrillic', 'greek'], 
  variable: '--font-inter',
  display: 'swap'
});

export const metadata = {
  title: 'テキスト読み上げアプリ',
  description: 'シンプルで使いやすいテキスト読み上げアプリ',
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
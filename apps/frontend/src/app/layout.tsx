import './global.css';

export const metadata = {
  title: 'TypeSpace',
  description: 'TypeSpace - Real-time collaboration platform',
  icons: {
    icon: '/TypeSpace.jpg',
  },
};

import QueryProvider from '../providers/QueryProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white min-h-screen">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

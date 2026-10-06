import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stereo Café | Controle de estoque',
  description: 'Estoque, receitas e operação do Stereo Café em São Paulo.',
  other: {
    'codex-preview': 'development',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}

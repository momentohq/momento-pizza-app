'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { View } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css';

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <View className={inter.className}>
          <Header />
          <View height="94vh" backgroundColor="#C2B2A9">
            {children}
          </View>
          <Footer />
        </View>
      </body>
    </html>
  )
}

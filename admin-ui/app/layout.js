'use client'
import Header from '@/components/Header'
import './globals.css'
import { Inter } from 'next/font/google'
import Footer from '@/components/Footer'
import { View } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Momento Pizza Admin'
}

const RootLayout = ({ children }) => {
  return (
    <html>
      <body>
        <div className={inter.className}>
          <Header />
          <View style={backgroundStyle}>
            {children}
          </View>
          <Footer />
        </div>
      </body>
    </html>
  )
};

const backgroundStyle = {
  height: '94vh',
  backgroundColor: '#C2B2A9'
};

export default RootLayout;
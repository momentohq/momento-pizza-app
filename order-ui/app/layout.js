'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import Header from '@/components/header';
import { View, Text } from '@aws-amplify/ui-react'
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
          <View textAlign="center" backgroundColor="#C4F135" position="fixed" bottom="0" right="0" width="100%" padding=".5em">
            <Text>&copy; {new Date().getFullYear()} Momento. All rights reserved.</Text>
          </View>
        </View>
      </body>
    </html>
  )
}

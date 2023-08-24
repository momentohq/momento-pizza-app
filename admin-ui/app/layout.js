'use client'
import './globals.css'
import { Inter } from 'next/font/google'
import { View, Flex, Heading, Text, Link } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css';

const inter = Inter({ subsets: ['latin'] });

const RootLayout = ({ children }) => {
  return (
    <html>
      <body>
        <div className={inter.className}>
          <>
            <Flex direction="row" justifyContent="space-between" alignContent="center" padding="10px" backgroundColor="#25392B" boxShadow="medium">
              <Heading level="3"><Link href='/' textDecoration="none" color="white">Momento Pizza Admin</Link></Heading>
            </Flex>
            {process.env.NEXT_PUBLIC_ADMIN_API == 'REPLACE_ME' && (
              <Flex direction="column" width="100%" backgroundColor="red" height="3em" alignItems="center" justifyContent="center">
                <Text>You have not finished setting up this environment. Please update the <b>NEXT_PUBLIC_ADMIN_API</b> environment variable in the <i>next.config.js</i> file with the value of your deployed Admin API base url and restart the app.</Text>
              </Flex>
            )}
          </>
          <View height="94vh" backgroundColor="#C2B2A9">
            {children}
          </View>
          <View textAlign="center" backgroundColor="#C4F135" position="fixed" bottom="0" right="0" width="100%" padding=".5em">
            <Text>&copy; {new Date().getFullYear()} Momento. All rights reserved.</Text>
          </View>
        </div>
      </body>
    </html>
  )
};

export default RootLayout;
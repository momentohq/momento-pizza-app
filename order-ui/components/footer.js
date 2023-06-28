import React from 'react';
import { View, Text } from '@aws-amplify/ui-react';

const Footer = () => {
  return (
    <View textAlign="center" backgroundColor="#C4F135" position="fixed" bottom="0" right="0" width="100%" padding=".5em">
      <Text>&copy; {new Date().getFullYear()} Momento. All rights reserved.</Text>
    </View>
  );
};

export default Footer;
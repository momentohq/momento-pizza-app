'use client'
import React, { useState } from 'react';
import { Flex, Heading, View, Link, Button, Text } from '@aws-amplify/ui-react';
import { MdAddBox } from 'react-icons/md';
import { useRouter } from 'next/navigation';
const baseUrl = 'https://16xdrsr906.execute-api.us-east-1.amazonaws.com/dev';

const Header = () => {
  const router = useRouter();
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);
  
  const newOrder = async () => {
    try {
      setIsCreatingNewOrder(true);
      const response = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        body: JSON.stringify({ items: [] })
      });

      const data = await response.json();
      router.push(`/orders/${data.id}`);
    } catch (err) {
      console.error(err);
    }
    finally {
      setIsCreatingNewOrder(false);
    }
  };

  return (
    <Flex direction="row" justifyContent="space-between" alignContent="center" padding="10px" backgroundColor="#25392B" boxShadow="medium">
      <Heading level="3"><Link href='/' textDecoration="none" color="white">Momento Pizza</Link></Heading>
      <View cursor="pointer">
        <Button size="small" variation="primary" backgroundColor="white" isLoading={isCreatingNewOrder} onClick={newOrder}>
          <MdAddBox color="black" size="1.3em" />
          <Text marginLeft=".5em">New Order</Text>
        </Button>
      </View>
    </Flex>
  );
};

export default Header;
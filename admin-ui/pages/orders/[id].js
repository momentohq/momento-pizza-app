'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Card, Heading, Table, Flex, TableRow, TableCell, TableBody, View, Collection, withAuthenticator, Badge, Divider, Text } from '@aws-amplify/ui-react';
import Head from 'next/head';
import { Amplify } from "aws-amplify";
import awsExports from "../../aws-exports";
import Layout from '../../app/layout';

Amplify.configure({ ...awsExports });

const baseUrl = 'https://bgfi5qzotk.execute-api.us-east-1.amazonaws.com/dev';

const OrderDetail = () => {
  const [order, setOrder] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const response = await fetch(`${baseUrl}/orders/${id}`);
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order detail:', error);
    }
  };

  const handleStartOrder = async () => {
    setIsStarting(true)
    try {
      await updateStatus('IN PROGRESS');
      await fetchOrderDetail();
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const updateStatus = async (status) => {
    await fetch(`${baseUrl}/orders/${id}/statuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: status }),
    });
  };

  const handleRejectOrder = async () => {
    setIsRejecting(true);
    try {
      await updateStatus('REJECTED');
      await fetchOrderDetail();
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCompleteOrder = async () => {
    setIsCompleting(true);
    try {
      await updateStatus('COMPLETED');
      await fetchOrderDetail();
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleGoBack = () => {
    router.push('/');
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <Head>
        <title>Order Detail</title>
      </Head>
      <Flex direction="column" alignItems="center" padding="relative.medium">
        <Card borderRadius="medium" variation="outlined">
          <Flex alignItems="center" justifyContent="space-between" marginBottom="relative.small">
            <Heading level="4">Order Detail</Heading>
            <Badge variation="info">{order.status}</Badge>
          </Flex>
          <View>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell as="th">ID:</TableCell>
                  <TableCell>{order.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell as="th">Created At:</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell as="th">Creator:</TableCell>
                  <TableCell>{order.creator}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </View>
        </Card>

        <Collection items={order?.items} type="list" direction="row" gap="relative.small" wrap="wrap" marginTop="relative.small">
          {(item, index) => (
            <Card key={index} borderRadius="medium" maxWidth="20rem" variation="outlined">
              <Heading level="5">Pizza {index + 1}</Heading>
              <Divider size="small" orientation="horizontal" marginBottom="relative.small" marginTop="relative.small" />
              <Badge key={item.size + index}>{item.size}</Badge>
              <Badge key={item.crust + index} marginLeft="relative.xs" variation="warning">{item.crust}</Badge>
              <Badge key={item.sauce + index} marginLeft="relative.xs" variation="error">{item.sauce}</Badge>
              <Divider size="small" orientation="horizontal" marginBottom="relative.small" marginTop="relative.small" />
              <Collection items={item.toppings} type="list" direction="column" gap="relative.xs">
                {(item, index) => (
                  <Text key={"topping" + index}>{item}</Text>
                )}
              </Collection>
            </Card>
          )}
        </Collection>
        <Flex direction="row" marginTop="relative.small" justifyContent="space-between" width="30%" >
          <Button onClick={handleGoBack}>Go Back</Button>
          <Flex direction="row">
            {['SUBMITTED', 'IN PROGRESS'].includes(order?.status) && <Button onClick={handleRejectOrder} variation="warning">Reject Order</Button>}
            {order?.status == "SUBMITTED" && <Button onClick={handleStartOrder} variation="primary" isLoading={isStarting}>Start Order</Button>}
            {order?.status == "IN PROGRESS" && <Button onClick={handleCompleteOrder} variation="primary">Complete Order</Button>}
          </Flex>
        </Flex>
      </Flex>
    </Layout>
  );
};

export default withAuthenticator(OrderDetail);

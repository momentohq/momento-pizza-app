'use client'
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableRow, View, Badge, Heading, Text, Flex, Image, Loader } from '@aws-amplify/ui-react';
import { MdOutlineNavigateNext, MdRefresh } from 'react-icons/md';

const Home = () => {
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, [])

  const fetchOrders = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_ORDER_API}/orders`);
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const goToOrder = async (id) => {
    router.push(`/orders/${id}`);
  };

  const getStatusBadge = (status) => {
    let label, variation;
    switch (status) {
      case 'SUBMITTED':
        label = 'Pending';
        variation = 'info';
        break;
      case 'IN PROGRESS':
        label = 'Being Made';
        variation = 'warning';
        break;
      case 'COMPLETED':
        label = 'Out for Delivery';
        variation = 'success';
        break;
      case 'REJECTED':
        label = 'Rejected';
        variation = 'error';
        break;
      default:
        label = 'In Cart';
        variation = '';
        break;
    };

    return (<Badge size="small" variation={variation}>{label}</Badge>);
  };

  return (
    <>
      <Head>
        <title>Momento Pizza</title>
      </Head>
      <Flex direction="column" alignItems="center" justifyContent="center" padding="1em">
        <Flex direction="column" alignItems="center">
          <Heading level="4">Welcome to Momento Pizza!</Heading>
          <Text>Ready for an unforgettable pizza experience? You're in the right place!</Text>
          <Image src="/margherita-pizza.webp" width="16em" height="12em" borderRadius="10px" boxShadow="medium" />
        </Flex>
        <View width="80%">
          <Table highlightOnHover="true" backgroundColor="white" boxShadow="medium" size="small">
            <TableHead >
              <TableRow backgroundColor="#25392B">
                <TableCell as="th" fontSize="large" color="white">Created On</TableCell>
                <TableCell as="th" fontSize="large" color="white">Number of Pizzas</TableCell>
                <TableCell as="th" fontSize="large" color="white">Status</TableCell>
                <TableCell as="th" fontSize="large" color="white">Last Updated</TableCell>
                <TableCell as="th" > {isFetching ? <Loader size="2em" /> : <MdRefresh size="2em" cursor="pointer" color="white" onClick={fetchOrders} />}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} onClick={() => goToOrder(order.id)}>
                  <TableCell >{new Date(order.createdAt).toLocaleString('en-US', {
                    month: 'numeric',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}</TableCell>
                  <TableCell >{order.numItems}</TableCell>
                  <TableCell >{getStatusBadge(order.status)}</TableCell>
                  <TableCell >{order.lastUpdated ? new Date(order.lastUpdated).toLocaleString('en-US', {
                    month: 'numeric',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  }) : ''}</TableCell>
                  <TableCell> <MdOutlineNavigateNext size="1.5em" cursor="pointer" color="black" onClick={() => goToOrder(order.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </View>
      </Flex>
    </>
  );
};

export default Home;

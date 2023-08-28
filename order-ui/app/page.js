'use client'
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableRow, View, Heading, Text, Flex, Image, Loader } from '@aws-amplify/ui-react';
import { MdOutlineNavigateNext, MdRefresh } from 'react-icons/md';
import { ToastContainer, toast } from 'react-toastify';
import { getStatusBadge } from '@/util/utils';
import 'react-toastify/dist/ReactToastify.css';

const Home = () => {
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_ORDER_API}/orders`);
      const data = await response.json();

      setOrders(data);
    } catch (err) {
      console.error(err);
      toast.error('There was a problem loading orders from the Order API', { position: 'top-right', autoClose: 10000, draggable: false, hideProgressBar: true, theme: 'colored' });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <>
      <Head>
        <title>Momento Pizza</title>
      </Head>
      <Flex direction="column" alignItems="center" justifyContent="center" padding="1em" backgroundColor="#C2B2A9">
        <Flex direction="column" alignItems="center">
          <Heading level="4">Welcome to Momento Pizza!</Heading>
          <Text>Ready for an unforgettable pizza experience? You're in the right place!</Text>
          <Image src="/mo-pizza-delivery-small.png" width="16em" height="auto" borderRadius="10px" boxShadow="medium" />
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
                <TableRow key={order.id} onClick={() => router.push(`/orders/${order.id}`)}>
                  <TableCell >{new Date(order.createdAt).toLocaleString('en-US', {
                    month: 'numeric',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}</TableCell>
                  <TableCell >{order.numItems}</TableCell>
                  <TableCell >{getStatusBadge(order.status, 'small')}</TableCell>
                  <TableCell >{order.lastUpdated ? new Date(order.lastUpdated).toLocaleString('en-US', {
                    month: 'numeric',
                    day: '2-digit',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  }) : ''}</TableCell>
                  <TableCell> <MdOutlineNavigateNext size="1.5em" cursor="pointer" color="black" onClick={() => router.push(`/orders/${order.id}`)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </View>
      </Flex>
      <ToastContainer />
    </>
  );
};

export default Home;

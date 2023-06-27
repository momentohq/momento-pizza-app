'use client'
import React, { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import { Table, TableBody, TableCell, TableHead, TableRow, View, withAuthenticator, Button, Badge, Heading, Text, Flex, Loader } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Amplify } from "aws-amplify";
import awsExports from "../aws-exports";
import { MdOutlineNavigateNext, MdRefresh } from 'react-icons/md';

Amplify.configure({ ...awsExports });

const Home = () => {
  const [orders, setOrders] = useState([]);
  const [username, setUsername] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = await Auth.currentAuthenticatedUser();
      setUsername(user.username);
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsFetching(true);
      const session = await Auth.currentSession();
      const response = await fetch('https://bgfi5qzotk.execute-api.us-east-1.amazonaws.com/dev/orders', {
        // headers: {
        //   Authorization: session.getIdToken().getJwtToken(),
        // },
      });
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const goToOrderDetail = (orderId) => {
    router.push(`/orders/${orderId}`);
  };

  const goToDashboard = () => {
    window.open('https://console.aws.amazon.com/cloudwatch/home#dashboards/dashboard/MomentoPizza', '_blank');
  };

  const getStatusBadgeType = (status) => {
    switch(status){
      case 'SUBMITTED':
        return 'warning';
      case 'IN PROGRESS': 
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return '';
    };
  };

  return (
    <>
    <Head>
      <title>Momento Pizza Admin</title>
    </Head>
    <Flex direction="column" alignItems="center" padding="relative.medium">
      <Flex direction="column" gap="relative.medium" paddingBottom="relative.medium" alignItems="center">
        <Heading level="1">Welcome, {username}</Heading>
        <Text >
          Use this application to monitor and fulfill orders that come in through the Momento Pizza ordering app.
        </Text>
        <Button backgroundColor="#00C88C" variation="primary" onClick={goToDashboard}>View CloudWatch Metrics</Button>
      </Flex>
      <Table highlightOnHover="true" backgroundColor="white" boxShadow="medium">
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
            <TableRow key={order.id} onClick={() => goToOrderDetail(order.id)}>
              <TableCell >{new Date(order.createdAt).toLocaleString('en-US', {
                month: 'numeric',
                day: '2-digit',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}</TableCell>
              <TableCell >{order.numItems}</TableCell>
              <TableCell ><Badge size="small" variation={getStatusBadgeType(order.status)}>{order.status}</Badge></TableCell>
              <TableCell >{order.lastUpdated ? new Date(order.lastUpdated).toLocaleString('en-US', {
                month: 'numeric',
                day: '2-digit',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              }) : ''}</TableCell>
              <TableCell> <MdOutlineNavigateNext size="1.5em" cursor="pointer"/></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Flex>
    </>
  );
};

export default withAuthenticator(Home);

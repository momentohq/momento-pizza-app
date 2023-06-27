import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import styles from './orders.module.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://16xdrsr906.execute-api.us-east-1.amazonaws.com/dev/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const getStatusDisplay = (status) => {
    if (status === 'WAITING ON CUSTOMER') {
      return 'IN CART';
    } else if (status === 'IN PROGRESS') {
      return 'BEING COOKED';
    } else {
      return status;
    }
  };

  return (
    <>
      <Head>
        <title>My Orders | Momento Pizza</title>
      </Head>
      <div className={styles.container}>
        <Header />
        <main>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>My Orders</h2>
            {orders.length === 0 ? (
              <p className={styles.emptyMessage}>No orders found.</p>
            ) : (
              <ul className={styles.orderList}>
                {orders.map((order) => (
                  <li key={order.id} className={styles.orderItem}>
                    <div className={styles.orderCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.orderDateTime}>
                          {new Date(order.createdAt).toLocaleString('en-US', {
                            month: 'numeric',
                            day: '2-digit',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true,
                          })}
                        </div>
                        <div className={styles.orderStatus}>{getStatusDisplay(order.status)}</div>
                      </div>
                      <div className={styles.orderItemCount}>{`${order.numItems} pizzas`}</div>
                      <div className={styles.cardHeader}>
                        {order.lastUpdated ? (
                          <div className={styles.orderLastUpdated}>
                            Last updated:{' '}
                            {new Date(order.lastUpdated).toLocaleString('en-US', {
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true,
                            })}
                          </div>
                        ) : (
                          <div className={styles.emptyDiv}></div> // Add this line for the empty div
                        )}

                        <Link href={`/orders/${order.id}`}>
                          <div className={styles.navigateIcon}>
                            <img src="/right-arrow.svg" alt="Navigate" />
                          </div>
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={styles.section}>
            <button className={styles.newOrderButton}>New Order</button>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Orders;

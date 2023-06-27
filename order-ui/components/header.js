'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/header.module.css';

const Header = () => {
  const router = useRouter();
  function navigateHome() {
    router.push('/');
  }

  return (
    <header className={styles.header}>
      <h1 className={styles.title} onClick={navigateHome}>Momento Pizza</h1>
      <a href="/orders" className={styles.ordersLink}>
        <img src="/orders-icon.svg" alt="My Orders" className={styles.ordersIcon} />
      </a>
    </header>
  );
};

export default Header;
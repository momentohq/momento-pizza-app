import React from 'react';
import styles from '../styles/footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
        <p className={styles.footerText}>
          &copy; {new Date().getFullYear()} Momento. All rights reserved.
        </p>
      </footer>
  );
}

export default Footer;
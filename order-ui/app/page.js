'use client'
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Header from '@/components/header';
import Footer from '@/components/footer';

const baseUrl = 'https://16xdrsr906.execute-api.us-east-1.amazonaws.com/dev';

const Home = () => {
  const router = useRouter();

  async function newOrder() {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      body: JSON.stringify({ items: [] })
    });

    const data = await response.json();
    router.push(`/orders/${data.id}`);
  }

  return (
    <>
      <Head>
        <title>Momento Pizza: Your Best Choice for Pizza</title>
      </Head>
      <div className={styles.container}>
        <Header />
        <main className={styles.grid}>
          <section className={`${styles.section} ${styles.featureSection}`}>
            <h1 className={styles.sectionTitle}>Welcome to Momento Pizza</h1>
            <p className={styles.sectionDescription}>
              Ready for an unforgettable pizza experience? You're in the right place!
            </p>
            <img src="/margherita-pizza.webp" alt="Momento Pizza" className={styles.featureImage} />
          </section>
          <div className={styles.subGrid}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Get a Taste of Quality</h2>
              <p className={styles.sectionDescription}>
                Savor the exquisite flavors of our pizza, made from fresh, high-quality ingredients. Create your pizza masterpiece now!
              </p>
              <img src="/pepperoni-pizza.jpg" alt="Quality Pizza" className={styles.sectionImage} />
              <button className={styles.ctaButton} onClick={newOrder}>Create Your Pizza</button>
            </section>
            <section className={styles.middleSection}>
              <h2 className={styles.sectionTitle}>Your Pizza, Your Way</h2>
              <p className={styles.sectionDescription}>
                Customize your pizza with a variety of delicious toppings. Craft your perfect pizza today!
              </p>
              <img src="/veggie-pizza.webp" alt="Customizable Pizza" className={styles.sectionImage} />
              <button className={styles.ctaButton} onClick={newOrder}>Choose Your Toppings</button>
            </section>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Feeling Hungry Yet?</h2>
              <p className={styles.sectionDescription}>
                Our mouthwatering pizzas are waiting for you. Order now and enjoy Momento Pizza at its best!
              </p>
              <img src="/bbq-pizza.jpg" alt="Quality Pizza" className={styles.sectionImage} />
              <button className={styles.ctaButton} onClick={newOrder}>Order Now</button>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Home;

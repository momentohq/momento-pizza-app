import { useRouter } from 'next/router';
import { FaArrowLeft, FaTimes, FaPlusCircle } from 'react-icons/fa';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Header from '@/components/header';
import Footer from '@/components/footer';
import styles from './[id].module.css';

const baseUrl = 'https://16xdrsr906.execute-api.us-east-1.amazonaws.com/dev';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [status, setStatus] = useState('');
  const orderRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);

  const fetchOrder = async (orderId) => {
    try {
      const response = await fetch(`${baseUrl}/orders/${orderId}`);
      const data = await response.json();
      if (data.items.length === 0) {
        data.items.push({
          size: 'large',
          crust: 'hand-tossed',
          sauce: 'tomato',
          toppings: [],
        });
      }

      setOrder(data);
      orderRef.current = data;
      setActiveItem(0);
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const handleTabClick = (itemIndex) => {
    setActiveItem(itemIndex);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedItems = [...order.items];
    updatedItems[activeItem][name] = value;
    setOrder((prevOrder) => ({
      ...prevOrder,
      items: updatedItems,
    }));
    debounceSaveOrder();
  };

  const handleToppingChange = (e) => {
    const { value } = e.target;
    let index = order.items[activeItem].toppings.indexOf(value);
    if (index > -1) {
      order.items[activeItem].toppings.splice(index, 1);
    } else {
      order.items[activeItem].toppings.push(value);
    }
    setOrder({ ...order });
    debounceSaveOrder();
  };

  const handleAddItem = () => {
    const newItem = {
      size: 'large',
      crust: 'hand-tossed',
      sauce: 'tomato',
      toppings: [],
    };
    const newOrder = { items: [...order.items, newItem] };
    setOrder(newOrder);
    orderRef.current = newOrder;
    setActiveItem(newOrder.items.length - 1);
    debounceSaveOrder();
  };

  const handleDeleteItem = (e) => {
    e.stopPropagation();
    const updatedItems = [...order.items];
    if (updatedItems.length === 1) {
      return;
    }

    updatedItems.splice(activeItem, 1);
    const newOrder = { items: updatedItems };
    setOrder(newOrder);
    orderRef.current = newOrder;

    let newActiveItem = activeItem;
    if (activeItem === order.items.length - 1) {
      newActiveItem = activeItem - 1;
    }
    setActiveItem(newActiveItem !== -1 ? newActiveItem : null);
    debounceSaveOrder();
  };

  const debounceSaveOrder = () => {
    clearTimeout(debounceSaveOrder.timeout);
    debounceSaveOrder.timeout = setTimeout(saveOrder, 1000);
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

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${baseUrl}/orders/${id}/statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      });
      if (response.ok) {
        console.log('Order submitted successfully');
        router.push('/orders');
      } else {
        console.error('Failed to save order');
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const saveOrder = async () => {
    try {
      const response = await fetch(`${baseUrl}/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: orderRef.current.items }),
      });
      if (response.ok) {
        console.log('Order saved successfully');
      } else {
        console.error('Failed to save order');
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  if (!order) {
    return null;
  }

  const { items } = order;
  const isOrderEditable = status === 'WAITING ON CUSTOMER' || status === 'SUBMITTED';

  const sizeOptions = ['small', 'medium', 'large', 'x-large'];
  const crustOptions = ['thin', 'hand-tossed', 'deep dish'];
  const toppingsOptions = [
    'cheese',
    'pepperoni',
    'sausage',
    'chicken',
    'anchovies',
    'olives',
    'peppers',
    'mushrooms',
    'onions'
  ];
  const sauceOptions = ['tomato', 'alfredo', 'pesto', 'bbq'];

  return (
    <>
      <Head>
        <title>Order Details | Momento Pizza</title>
      </Head>
      <Header />
      <Link href="/orders">
        <div className={styles.backArrow}>
          <FaArrowLeft />
        </div>
      </Link>
      <div className={styles.container}>
        <h1 className={styles.heading}>
          Order Details
          <span className={styles.orderStatus}>{getStatusDisplay(status)}</span>
        </h1>
        <div className={styles.itemSection}>
          <div className={styles.itemTabs}>
            {items.map((item, index) => (
              <button
                key={index}
                className={`${styles.itemTab} ${index === activeItem ? styles.active : ''}`}
                onClick={() => handleTabClick(index)}
              >
                Pizza {index + 1}
                {isOrderEditable && activeItem === index && (
                  <FaTimes className={styles.deleteItemButton} onClick={handleDeleteItem} />
                )}
              </button>
            ))}
            {isOrderEditable && (
              <button className={styles.addItemButton} onClick={handleAddItem}>
                <FaPlusCircle className={styles.addIcon} /> Add Pizza
              </button>
            )}
          </div>
          {activeItem !== null && (
            <div className={styles.itemForm}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="size">
                  Size:
                </label>
                <select
                  name="size"
                  id="size"
                  value={items[activeItem]?.size}
                  onChange={handleInputChange}
                  disabled={!isOrderEditable}
                  className={styles.selectInput}
                >
                  {sizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="crust">
                  Crust:
                </label>
                <select
                  name="crust"
                  id="crust"
                  value={items[activeItem]?.crust}
                  onChange={handleInputChange}
                  disabled={!isOrderEditable}
                  className={styles.selectInput}
                >
                  {crustOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="sauce">
                  Sauce:
                </label>
                <select
                  name="sauce"
                  id="sauce"
                  value={items[activeItem]?.sauce}
                  onChange={handleInputChange}
                  disabled={!isOrderEditable}
                  className={styles.selectInput}
                >
                  {sauceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="toppings">
                  Toppings:
                </label>
                <div className={styles.chipList}>
                  {toppingsOptions.map((option) => (
                    <div
                      key={option}
                      className={`${styles.chip} ${items[activeItem]?.toppings.includes(option) ? styles.selectedChip : ''}`}
                      onClick={() => handleToppingChange({ target: { name: 'toppings', value: option } })}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="specialRequests">
                  Special Requests:
                </label>
                <textarea
                  name="specialRequests"
                  id="specialRequests"
                  value={items[activeItem]?.specialRequests || ''}
                  onChange={handleInputChange}
                  disabled={!isOrderEditable}
                  className={styles.textareaInput}
                />
              </div>
            </div>
          )}
        </div>
        {isOrderEditable && (
          <button className={styles.submitButton} disabled={!isOrderEditable} onClick={handleSubmit}>
            Submit Order
          </button>
        )}
      </div>
      <Footer />
    </>
  );
};

export default OrderDetail;

import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { MdAddBox, MdArrowBack, MdDelete } from 'react-icons/md';
import Layout from '../../app/layout';
import { View, ToggleButton, Flex, Heading, Badge, Tabs, TabItem, Card, SelectField, Button, Text, ToggleButtonGroup, ThemeProvider } from '@aws-amplify/ui-react';

const baseUrl = 'https://16xdrsr906.execute-api.us-east-1.amazonaws.com/dev';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [status, setStatus] = useState('');
  const [toppings, setToppings] = useState([]);
  const [size, setSize] = useState('large');
  const [sauce, setSauce] = useState('tomato');
  const [crust, setCrust] = useState('hand-tossed');
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
      changeActiveItem(0);
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const changeActiveItem = (index) => {
    let item = orderRef.current.items[index];
    if (!item) {
      index = 0;
      item = orderRef.current.items[index];
    }
    setSize(item.size);
    setSauce(item.sauce);
    setCrust(item.crust);
    setToppings(item.toppings);
    setActiveItem(index);
  };

  const handleTabClick = (itemIndex) => {
    changeActiveItem(itemIndex);
  };

  const handleInputChange = (name, value) => {
    const updatedItems = [...orderRef.current.items];
    updatedItems[activeItem][name] = value;
    const newOrder = { items: updatedItems };
    setOrder(newOrder);
    orderRef.current = newOrder;
    debounceSaveOrder();
  };

  const handleToppingChange = (e) => {
    setToppings(e);
    order.items[activeItem].toppings = e;
    const newOrder = { ...order };
    setOrder(newOrder);
    orderRef.current = newOrder;
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
    changeActiveItem(newOrder.items.length - 1);
    debounceSaveOrder();
  };

  const handleDeleteItem = () => {
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
    changeActiveItem(newActiveItem !== -1 ? newActiveItem : null);
    debounceSaveOrder();
  };

  const debounceSaveOrder = () => {
    clearTimeout(debounceSaveOrder.timeout);
    debounceSaveOrder.timeout = setTimeout(saveOrder, 1000);
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

  const toppingList = [
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

    return (<Badge size="large" variation={variation}>{label}</Badge>);
  };

  return (
    <ThemeProvider theme={theme} >
      <Layout>
        <Head>
          <title>Order Details | Momento Pizza</title>
        </Head>
        <Flex direction="column" alignItems="center">
          <Flex direction="column" alignItems="center" justifyContent="center" padding="1em" width="80%">
            <Flex direction="row" justifyContent="space-between" alignItems="center" >
              <Heading level="4">Order Details</Heading>
              {getStatusBadge(order.status)}
            </Flex>
            <View width="100%">
              <Tabs currentIndex={activeItem} onChange={(index) => handleTabClick(index)}>
                {items.map((item, index) => (
                  <TabItem title={"Pizza " + (index + 1)} key={"order" + index}>
                    <Card variation="elevated" width="100%">
                      <Flex direction="column">
                        <SelectField label="Size" size="small" isDisabled={!isOrderEditable} value={size} onChange={(e) => { setSize(e.target.value); handleInputChange('size', e.target.value); }}>
                          <option style={{ color: "black" }} value="small">Small</option>
                          <option style={{ color: "black" }} value="medium">Medium</option>
                          <option style={{ color: "black" }} value="large">Large</option>
                          <option style={{ color: "black" }} value="x-large">X-Large</option>
                        </SelectField>
                        <SelectField label="Crust" size="small" isDisabled={!isOrderEditable} value={crust} onChange={(e) => { setCrust(e.target.value); handleInputChange('crust', e.target.value); }}>
                          <option style={{ color: "black" }} value="thin">Thin</option>
                          <option style={{ color: "black" }} value="hand-tossed">Hand-tossed</option>
                          <option style={{ color: "black" }} value="deep dish">Deep Dish</option>
                        </SelectField>
                        <SelectField label="Sauce" size="small" isDisabled={!isOrderEditable} value={sauce} onChange={(e) => { setSauce(e.target.value); handleInputChange('sauce', e.target.value); }}>
                          <option style={{ color: "black" }} value="tomato">Tomato</option>
                          <option style={{ color: "black" }} value="alfredo">Alfredo</option>
                          <option style={{ color: "black" }} value="pesto">Pesto</option>
                          <option style={{ color: "black" }} value="bbq">BBQ</option>
                        </SelectField>
                        <Text fontSize=".85rem" color="darkslategray">Toppings</Text>
                        <ToggleButtonGroup value={toppings} isSelectionRequired onChange={handleToppingChange}>
                          {toppingList.map((topping, toppingIndex) => (
                            <ToggleButton key={"topping" + toppingIndex} variation="primary" isDisabled={!isOrderEditable} borderRadius="xxl" fontSize=".9rem" value={topping} marginRight=".5em">{topping}</ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                        {isOrderEditable && (<Flex direction="row" alignItems="center" justifyContent="space-between" marginTop=".5em">
                          <Button size="small" onClick={handleAddItem}><MdAddBox size="1em" /> <Text marginLeft=".5em" >Add Another</Text></Button>
                          <Button size="small" isDisabled={order?.items?.length == 1} variation="warning" onClick={handleDeleteItem}><MdDelete size="1em" /> <Text marginLeft=".5em">Remove From Cart</Text></Button>
                        </Flex>)}
                      </Flex>
                    </Card>
                  </TabItem>
                ))}
              </Tabs>
              <Card variation="elevated" marginTop="2em" padding=".7em">
                <Flex direction="row" alignItems="center" justifyContent="space-between">
                  <Button variation="link" onClick={() => router.push('/')}><MdArrowBack size="1em" /> <Text marginLeft=".5em">Go Back</Text></Button>
                  {isOrderEditable && <Button variation="primary" onClick={handleSubmit}>Submit Order</Button>}
                </Flex>
              </Card>
            </View>
          </Flex>
        </Flex>
      </Layout>
    </ThemeProvider>
  );
};

const theme = {
  name: 'toggleButton-theme',
  tokens: {
    components: {
      selectField: {
        color: { value: 'black' },
        option: {
          color: { value: 'black' }
        }
      },
      button: {
        borderColor: { value: '#39b54a' },
        color: { value: '#39b54a' },
        primary: {
          backgroundColor: { value: '#39b54a' }
        }
      },
      togglebutton: {
        primary: {
          borderWidth: { value: '0' },
          borderColor: { value: 'white' },
          _pressed: {
            backgroundColor: { value: '#39b54a' },
            borderColor: { value: 'white' },
            _focus: {
              backgroundColor: { value: '#39b54a' },
              borderColor: { value: 'white' }
            }
          },
          _hover: {
            backgroundColor: { value: '#25392B' },
            color: { value: 'white' }
          },
          _focus: {
            borderColor: { value: 'white' }
          },
          _active: {
            borderColor: { value: 'white' }
          }
        },
        borderWidth: { value: '0' },
        borderColor: { value: 'white' },
        _pressed: {
          backgroundColor: { value: '#39b54a' },
          borderColor: { value: 'white' },
          _focus: {
            backgroundColor: { value: '#39b54a' },
            borderColor: { value: 'white' }
          }
        },
        _hover: {
          backgroundColor: { value: '#25392B' },
          color: { value: 'white' }
        },
        _focus: {
          borderColor: { value: 'white' }
        },
        _active: {
          borderColor: { value: 'white' }
        }
      },
    },
  },
};

export default OrderDetail;

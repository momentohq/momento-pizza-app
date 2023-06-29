const sizes = ["small", "medium", "large", "x-large"];
const crusts = ["thin", "hand-tossed", "deep dish"];
const toppings = ["cheese", "pepperoni", "sausage", "olives", "peppers", "mushrooms", "onions", "anchovies", "chicken"];
const sauces = ["tomato", "alfredo", "pesto", "bbq"];

exports.handler = async (state) => {
  const orders = [];
  for (let i = 0; i < state.numOrders; i++) {
    orders.push(generateOrder());
  }

  return { orders };
};

const generateOrder = () => {
  const pizzaCount = getRandomNumber(6);
  const pizzas = [];
  for (let i = 0; i < pizzaCount; i++) {
    let toppingCount = getRandomNumber(toppings.length);
    let availableToppings = [...toppings];
    while (availableToppings.length > toppingCount) {
      availableToppings = shuffleArray(availableToppings);
      availableToppings.pop();
    }

    pizzas.push({
      size: sizes[getRandomNumber(sizes.length)],
      crust: crusts[getRandomNumber(crusts.length)],
      sauce: sauces[getRandomNumber(sauces.length)],
      toppings: availableToppings
    });
  }

  return { items: pizzas };
};

const getRandomNumber = (max) => {
  return Math.floor(Math.random() * max);
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
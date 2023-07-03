const axios = require('axios').default;

exports.handler = async (state) => {
  let authToken;

  const config = getAxiosConfig(state, authToken);
  const iterations = state.iterations || 1;
  const responses = [];
  for (let i = 0; i < iterations; i++) {
    const response = await axios.request(config);
    responses.push(response.data);
  }
  if (iterations == 1) {
    return responses[0];
  }

  return responses;
};

const getAxiosConfig = (state) => {
  const config = {
    method: state.request.method,
    baseURL: state.request.baseUrl,
    ...state.request.body && { data: state.request.body },
    responseType: 'json',
    validateStatus: (status) => status < 500
  };

  return config;
};
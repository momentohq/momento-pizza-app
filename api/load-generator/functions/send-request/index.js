const axios = require('axios').default;

exports.handler = async (state) => {
  let authToken;
  
  const config = getAxiosConfig(state, authToken);
  const response = await axios.request(config);
  return response.data;
};

const getAxiosConfig = (state, authToken) => {
  const config = {
    method: state.request.method,
    baseURL: state.request.baseUrl,
    ...state.request.body && { data: state.request.body },
    responseType: 'json',
    validateStatus: (status) => status < 400
  };

  return config;
};
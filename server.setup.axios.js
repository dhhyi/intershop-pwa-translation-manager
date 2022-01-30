global.axios = require("axios");

axios.defaults.baseURL = "http://localhost:" + (process.env.PORT || "8001");

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

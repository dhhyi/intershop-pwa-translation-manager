global.axios = require("axios");

global.axios.defaults.baseURL =
  "http://localhost:" + (process.env.PORT || "8001");

global.axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response)
);

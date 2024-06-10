export const sendError = (code, message, headers = {}) => ({
  body: {
    error: {
      code,
      message,
    },
  },
  headers,
  statusCode: code,
});

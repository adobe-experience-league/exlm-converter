export const sendError = (code, message) => ({
  body: {
    error: {
      code,
      message,
    },
  },
  headers: {},
  statusCode: code,
});

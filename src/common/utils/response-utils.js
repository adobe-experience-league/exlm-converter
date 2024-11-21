export const sendError = (code, message, headers = {}) => ({
  body: {
    error: {
      code,
      message,
    },
  },
  headers: {
    'Content-Type': 'application/json',
    ...headers,
  },
  statusCode: code,
});

export const sendSuccess = (body, headers = {}) => ({
  body,
  headers,
  statusCode: 200,
});

export const sendSuccessJson = (body, headers = {}) =>
  sendSuccess(body, {
    ...headers,
    'Content-Type': 'application/json',
  });

export const sendRedirect = (Location, headers = {}) => ({
  headers: {
    body: '',
    Location,
    ...headers,
  },
  statusCode: 301,
});

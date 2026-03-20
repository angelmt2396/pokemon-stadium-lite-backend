export const buildSuccessResponse = ({ data, meta = null }) => {
  const response = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
};

export const buildErrorResponse = ({ message, details = null }) => {
  const response = {
    success: false,
    message,
  };

  if (details) {
    response.details = details;
  }

  return response;
};

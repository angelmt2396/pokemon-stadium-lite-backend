import { getValidationMessage } from './validation-utils.js';

export const withSocketValidation = (schema, handler) => async (payload, callback) => {
  const parsedPayload = schema.safeParse(payload);

  if (!parsedPayload.success) {
    if (typeof callback === 'function') {
      callback({
        ok: false,
        message: getValidationMessage(parsedPayload.error),
      });
    }

    return;
  }

  return handler(parsedPayload.data, callback);
};


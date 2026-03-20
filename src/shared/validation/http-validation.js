import { ZodError } from 'zod';

import { toValidationAppError } from './validation-utils.js';

export const validateRequest = (schemas = {}) => (request, _response, next) => {
  try {
    if (schemas.params) {
      request.params = schemas.params.parse(request.params);
    }

    if (schemas.query) {
      request.query = schemas.query.parse(request.query);
    }

    if (schemas.body) {
      request.body = schemas.body.parse(request.body);
    }

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      next(toValidationAppError(error));
      return;
    }

    next(error);
  }
};


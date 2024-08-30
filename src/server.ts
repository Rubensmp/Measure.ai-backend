import fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { errorHandler } from './routes/_errors';

import { upload } from './routes/upload';
import { confirm } from './routes/confirm';
import { getCustomerMeasure } from './routes/get-measures';

const app = fastify();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler(errorHandler);

app.register(upload);
app.register(confirm);
app.register(getCustomerMeasure);

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running.');
});

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const isBase64 = (base64Image: string) => {
  const regex =
    /^data:image\/(?:gif|png|jpeg|bmp|webp|svg\+xml)(?:;charset=utf-8)?;base64,(?:[A-Za-z0-9]|[+/])+={0,2}/;
  return base64Image && regex.test(base64Image);
};

const measureTypes = ['water', 'gas'];

export async function upload(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/upload',
    {
      schema: {
        summary: 'Upload a measure',
        tags: ['measure'],
        body: z.object({
          image: z.string().refine(isBase64),
          customer_code: z.string().uuid(),
          measure_datetime: z.string().pipe(z.coerce.date()),
          measure_type: z
            .string()
            .refine(value => measureTypes.includes(value.toLowerCase()), {
              message: 'Tipo de medição inválido. Deve ser "water" ou "gas".',
            }),
        }),
        response: {
          200: z.object({
            image_url: z.string(),
            measure_value: z.number().int(),
            measure_uuid: z.string().uuid(),
          }),
          409: z.object({
            error_code: z.string(),
            error_description: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { image, customer_code, measure_datetime, measure_type } =
        request.body;

      const typeLowerCase = measure_type.toLowerCase();

      const existingMeasure = await prisma.measure.findFirst({
        where: {
          customerId: customer_code,
          type: typeLowerCase,
          measuredAt: {
            gte: new Date(
              measure_datetime.getFullYear(),
              measure_datetime.getMonth(),
              1,
            ),
            lt: new Date(
              measure_datetime.getFullYear(),
              measure_datetime.getMonth() + 1,
              1,
            ),
          },
        },
      });

      if (existingMeasure) {
        return reply.status(409).send({
          error_code: 'DOUBLE_REPORT',
          error_description: 'Leitura do mês já realizada',
        });
      }

      const customerAlreadyExists = await prisma.customer.findUnique({
        where: {
          id: customer_code,
        },
      });

      if (!customerAlreadyExists) {
        await prisma.customer.create({
          data: {
            id: customer_code,
          },
        });
      }

      const measure = await prisma.measure.create({
        data: {
          imageBase64: image,
          customerId: customer_code,
          measureVolume: 3,
          type: typeLowerCase,
          measuredAt: measure_datetime,
        },
      });

      return reply.status(201).send({
        measure_uuid: measure.id,
        image_url: measure.imageBase64,
        measure_value: measure.measureVolume,
      });
    },
  );
}

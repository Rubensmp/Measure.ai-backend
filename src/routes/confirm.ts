import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function confirm(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/confirm',
    {
      schema: {
        summary: 'Confirm measure',
        tags: ['measure'],
        body: z.object({
          measure_uuid: z.string().uuid(),
          confirmed_value: z
            .number()
            .int()
            .refine(value => value >= 0, {
              message: 'Valor confirmado deve ser um número inteiro positivo.',
            }),
        }),
        response: {
          200: z.object({
            sucess: z.boolean(),
          }),
          400: z.object({
            error_code: z.string(),
            error_description: z.string(),
          }),
          404: z.object({
            error_code: z.string(),
            error_description: z.string(),
          }),
          409: z.object({
            error_code: z.string(),
            error_description: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { measure_uuid, confirmed_value } = request.body;

      const existingMeasure = await prisma.measure.findUnique({
        where: {
          id: measure_uuid,
        },
      });

      const isValuesEqual = confirmed_value === existingMeasure?.measureVolume;

      if (existingMeasure === null) {
        return reply.status(404).send({
          error_code: 'MEASURE_NOT_FOUND',
          error_description: 'Leitura não encontrada',
        });
      }

      if (existingMeasure?.hasConfirmed) {
        return reply.status(409).send({
          error_code: 'DOUBLE_REPORT',
          error_description: 'Leitura do mês já realizada',
        });
      }

      if (!existingMeasure?.hasConfirmed && !isValuesEqual) {
        return reply.status(200).send({
          sucess: false,
        });
      }

      if (!existingMeasure?.hasConfirmed && isValuesEqual) {
        const updatedTime = new Date();

        await prisma.measure.update({
          where: {
            id: measure_uuid,
          },
          data: {
            hasConfirmed: true,
            updatedAt: updatedTime,
          },
        });

        await prisma.customer.update({
          where: {
            id: existingMeasure.customerId,
          },
          data: {
            updatedAt: updatedTime,
          },
        });

        return reply.status(200).send({
          sucess: true,
        });
      }
    },
  );
}

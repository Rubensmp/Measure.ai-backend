import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function getCustomerMeasure(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:customer_code/list',
    {
      schema: {
        summary: 'Get costumer measure history',
        tags: ['measure'],
        params: z.object({
          customer_code: z.string().uuid(),
        }),
        querystring: z.object({
          measure_type: z
            .string()
            .nullish()
            .transform(type => type?.toLocaleLowerCase()),
        }),
        response: {
          200: z.object({
            customer_code: z.string().uuid(),
            measures: z.array(
              z.object({
                measure_uuid: z.string().uuid(),
                measure_datetime: z.date(),
                measure_type: z.string(),
                has_confirmed: z.boolean(),
                image_url: z.string(),
              }),
            ),
          }),
          404: z.object({
            error_code: z.string(),
            error_description: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { customer_code } = request.params;
      const { measure_type } = request.query;

      const validMeasureType =
        measure_type === '' ||
        measure_type === 'water' ||
        measure_type === 'gas';

      if (measure_type !== undefined && !validMeasureType) {
        return reply.status(400).send({
          error_code: 'INVALID_TYPE',
          error_description: 'Tipo de medição não permitida',
        });
      }

      const filters: any = {};

      if (measure_type) {
        filters.type = measure_type;
      }

      const custumer = await prisma.customer.findUnique({
        where: {
          id: customer_code,
        },
      });

      if (custumer === null) {
        return reply.status(404).send({
          error_code: 'MEASURES_NOT_FOUND',
          error_description: 'Nenhuma leitura encontrada',
        });
      }

      const measures = await prisma.measure.findMany({
        select: {
          id: true,
          measuredAt: true,
          type: true,
          hasConfirmed: true,
          imageBase64: true,
          //trocar para o link depois da integração
        },
        where: {
          customerId: custumer.id,
          ...filters,
        },
        orderBy: {
          measuredAt: 'desc',
        },
      });

      return reply.status(200).send({
        customer_code: custumer.id,
        measures: measures.map(measure => {
          return {
            measure_uuid: measure.id,
            measure_datetime: measure.measuredAt,
            measure_type: measure.type,
            has_confirmed: measure.hasConfirmed,
            image_url: measure.imageBase64,
          };
        }),
      });
    },
  );
}

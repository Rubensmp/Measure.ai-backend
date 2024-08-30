import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError & { issues?: any[] },
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error.validation || error.issues) {
    const firstIssue =
      error.issues?.[0] || (error.validation && error.validation[0]);

    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description: firstIssue?.message || 'Dados inválidos fornecidos.',
    });
  }

  reply.status(500).send({
    error_code: 'INTERNAL_SERVER_ERROR',
    error_description: 'Erro interno do servidor.',
  });
}

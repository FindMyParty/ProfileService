import type { FastifyRequest, FastifyReply } from 'fastify';

// Auth enforcement is handled by the API Gateway.
// This middleware exists for future use if the service needs to verify JWTs directly.
export async function authMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // No-op: profile-service trusts the caller identity
}

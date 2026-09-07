import { authenticationMiddleware, type PagesContext } from '../server/auth';

export const onRequest = (context: PagesContext) => authenticationMiddleware(context);

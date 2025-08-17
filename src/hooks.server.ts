// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const p = event.url.pathname;
	const PUBLIC = new Set(['/login/spotify', '/callback/spotify', '/debug', '/', '/favicon.svg']);
	if (p.startsWith('/assets') || p.startsWith('/_app') || PUBLIC.has(p)) return resolve(event);

	const at = event.cookies.get('sp_at');
	if (!at) throw redirect(303, '/login/spotify');
	return resolve(event);
};

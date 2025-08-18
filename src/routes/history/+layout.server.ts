import { redirect } from '@sveltejs/kit';

export const load = async ({ parent }) => {
	const { session } = await parent();
	
	if (!session.loggedIn) {
		throw redirect(303, '/');
	}
	
	return {};
};

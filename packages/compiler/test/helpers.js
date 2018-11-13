import assert from 'assert';

// eslint-disable-next-line import/prefer-default-export
export async function assertThrowsAsync(fn, ...other) {
	let error;
	try {
		await fn();
	} catch (err) {
		error = err;
	}
	assert.throws(() => {
		if (error) {
			throw error;
		}
	}, ...other);
}

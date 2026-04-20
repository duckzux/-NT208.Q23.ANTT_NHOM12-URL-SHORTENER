const API_BASE_URL = `${window.location.origin}/backend/api`;

async function apiRequest(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {}),
		},
		...options,
	});

	const contentType = response.headers.get('content-type') || '';
	const isJson = contentType.includes('application/json');
	const payload = isJson ? await response.json() : {};

	if (!response.ok) {
		const message = payload.error || payload.message || `HTTP ${response.status}`;
		throw new Error(message);
	}

	return payload;
}

window.ShortenApi = {
	shorten(longUrl, customAlias = '', expiresAt = '') {
		return apiRequest('/shorten.php', {
			method: 'POST',
			body: JSON.stringify({ longUrl, customAlias, expiresAt }),
		});
	},
};

window.AuthApi = {
	register(email, password) {
		return apiRequest('/auth/register.php', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		});
	},

	login(email, password) {
		return apiRequest('/auth/login.php', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		});
	},

	me() {
		return apiRequest('/auth/me.php', {
			method: 'GET',
		});
	},

	logout() {
		return apiRequest('/auth/logout.php', {
			method: 'POST',
			body: JSON.stringify({}),
		});
	},
};


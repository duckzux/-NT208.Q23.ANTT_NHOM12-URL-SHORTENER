(function () {
	const navContainer = document.querySelector('.nav-link');
	const pagesContainer = document.querySelector('.nav-pages');
	const form = document.querySelector('.valform');
	const emailInput = document.getElementById('mail');
	const passwordInput = document.getElementById('pwd');
	const confirmPasswordInput = document.getElementById('repwd');

	function ensureMessageElement() {
		if (!form) {
			return null;
		}

		let message = form.querySelector('.form-message');
		if (!message) {
			message = document.createElement('p');
			message.className = 'form-message';
			message.style.marginTop = '10px';
			message.style.fontSize = '14px';
			message.style.textAlign = 'center';
			form.appendChild(message);
		}

		return message;
	}

	function showMessage(text, isError) {
		const message = ensureMessageElement();
		if (!message) {
			return;
		}

		message.textContent = text;
		message.style.color = isError ? '#ff4444' : '#28a745';
		message.style.fontWeight = '600';
	}

	function renderGuestNavbar() {
		if (pagesContainer) pagesContainer.innerHTML = '';
		if (!navContainer) return;

		navContainer.innerHTML = `
			<a href="signin.html">Sign-in</a>
			<a href="register.html" class="btn-reg">Register</a>
		`;
	}

	function renderAuthNavbar(user) {
		if (!navContainer) return;

		const username = user.username || (user.email ? user.email.split('@')[0] : 'User');

		if (pagesContainer) {
			pagesContainer.innerHTML = `
				<a href="index.html">Home</a>
				<a href="dashboard.html">Dashboard</a>
			`;
		}

		navContainer.innerHTML = `
			<span class="nav-username">${escapeHtml(username)}</span>
			<a href="#" class="btn-reg" id="logout-link">Logout</a>
		`;

		const logoutLink = document.getElementById('logout-link');
		if (!logoutLink) {
			return;
		}

		logoutLink.addEventListener('click', async function (event) {
			event.preventDefault();

			try {
				await window.AuthApi.logout();
				renderGuestNavbar();
				if (window.location.pathname.toLowerCase().endsWith('index.html') || 
					window.location.pathname === '/' || 
					window.location.pathname.endsWith('/')) {
					window.location.reload();
				} else {
					window.location.href = 'index.html';
				}
			} catch (error) {
				showMessage(error.message || 'Logout failed', true);
			}
		});
	}

	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	async function syncNavbar() {
		if (!window.AuthApi || !navContainer) {
			return;
		}

		try {
			const result = await window.AuthApi.me();
			if (result && result.user) {
				renderAuthNavbar(result.user);
				// Redirect khỏi trang signin/register nếu đã đăng nhập
				if (isSigninPage() || isRegisterPage()) {
					window.location.href = 'index.html';
				}
				return;
			}
		} catch (error) {
			// Unauthenticated or request failed, fallback to guest links.
		}

		renderGuestNavbar();
	}

	function isRegisterPage() {
		return window.location.pathname.toLowerCase().endsWith('register.html');
	}

	function isSigninPage() {
		return window.location.pathname.toLowerCase().endsWith('signin.html');
	}

	async function handleRegisterSubmit(event) {
		event.preventDefault();

		const email = (emailInput?.value || '').trim();
		const password = passwordInput?.value || '';
		const confirmPassword = confirmPasswordInput?.value || '';

		if (!email || !password || !confirmPassword) {
			showMessage('Please fill in all fields.', true);
			return;
		}

		if (password !== confirmPassword) {
			showMessage('Password confirmation does not match.', true);
			return;
		}

		if (password.length < 6) {
			showMessage('Password must be at least 6 characters.', true);
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			showMessage('Please enter a valid email address.', true);
			return;
		}

		try {
			const result = await window.AuthApi.register(email, password);
			const username = result?.user?.username || email.split('@')[0];
			showMessage(`Register successful. Welcome ${username}!`, false);
			renderAuthNavbar(result.user || { username, email });

			setTimeout(function () {
				window.location.href = 'index.html';
			}, 800);
		} catch (error) {
			showMessage(error.message || 'Register failed.', true);
		}
	}

	async function handleSigninSubmit(event) {
		event.preventDefault();

		const email = (emailInput?.value || '').trim();
		const password = passwordInput?.value || '';

		if (!email || !password) {
			showMessage('Please provide email and password.', true);
			return;
		}

		try {
			const result = await window.AuthApi.login(email, password);
			const username = result?.user?.username || email.split('@')[0];
			showMessage(`Login successful. Welcome ${username}!`, false);
			renderAuthNavbar(result.user || { username, email });

			setTimeout(function () {
				window.location.href = 'index.html';
			}, 800);
		} catch (error) {
			showMessage(error.message || 'Login failed.', true);
		}
	}

	async function init() {
		if (!window.AuthApi) {
			console.error('AuthApi not loaded');
			return;
		}

		await syncNavbar();

		if (!form) {
			return;
		}

		if (isRegisterPage()) {
			form.addEventListener('submit', handleRegisterSubmit);
		} else if (isSigninPage()) {
			form.addEventListener('submit', handleSigninSubmit);
		}
	}

	init();
})();


(function () {
	const toggleBtn = document.getElementById('togglebtn');
	const customBox = document.getElementById('custom-box');
	const form      = document.querySelector('.formshort');
	const urlInput  = document.getElementById('shortform');
	const aliasInput = document.getElementById('alias-group');
	const dateInput  = document.getElementById('date-group');
	const resultSection  = document.getElementById('result-section');
	const resultLink     = document.getElementById('result-link');
	const resultOriginal = document.getElementById('result-original');
	const btnCopy        = document.getElementById('btn-copy');

	if (toggleBtn && customBox) {
		toggleBtn.addEventListener('click', function () {
			customBox.classList.toggle('hidden');
		});
	}

	function isValidUrl(url) {
		try {
			const u = new URL(url);
			return u.protocol === 'http:' || u.protocol === 'https:';
		} catch {
			return false;
		}
	}

	function getOrCreateError() {
		let el = document.getElementById('shorten-error');
		if (!el) {
			el = document.createElement('p');
			el.id = 'shorten-error';
			el.className = 'shorten-error';
			const inputGroup = document.querySelector('.input-group');
			if (inputGroup) {
				inputGroup.insertAdjacentElement('afterend', el);
			}
		}
		return el;
	}

	function showError(msg) {
		const el = getOrCreateError();
		el.textContent = msg;
		el.style.display = 'block';
	}

	function clearError() {
		const el = document.getElementById('shorten-error');
		if (el) {
			el.style.display = 'none';
			el.textContent = '';
		}
	}

	function showResult(result) {
		if (!resultSection || !resultLink) return;

		var shortUrl = window.location.origin + '/' + result.shortCode;
		resultLink.href = shortUrl;
		resultLink.textContent = shortUrl;

		if (resultOriginal) {
			const display = result.longUrl.length > 70
				? result.longUrl.slice(0, 67) + '...'
				: result.longUrl;
			resultOriginal.textContent = display;
		}

		resultSection.classList.remove('hidden');
		resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	async function handleShorten(event) {
		event.preventDefault();
		clearError();

		const longUrl     = (urlInput?.value || '').trim();
		const customAlias = (aliasInput?.value || '').trim();
		const expiresAt   = dateInput?.value || '';

		if (!longUrl) {
			showError('Vui lòng nhập URL.');
			return;
		}

		if (!isValidUrl(longUrl)) {
			showError('URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://');
			return;
		}

		const submitBtn = form.querySelector('.btn-shorten');
		if (submitBtn) {
			submitBtn.disabled = true;
			submitBtn.textContent = '...';
		}

		try {
			const result = await window.ShortenApi.shorten(longUrl, customAlias, expiresAt);
			showResult(result);
		} catch (error) {
			showError(error.message || 'Không thể rút gọn URL. Vui lòng thử lại.');
		} finally {
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.textContent = 'Rút gọn';
			}
		}
	}

	if (btnCopy) {
		btnCopy.addEventListener('click', function () {
			const url = resultLink?.href || '';
			if (!url || url === '#') return;

			const markCopied = function () {
				btnCopy.innerHTML = '<i class="fa-solid fa-check"></i>';
				btnCopy.classList.add('copied');
				setTimeout(function () {
					btnCopy.innerHTML = '<i class="fa-regular fa-copy"></i>';
					btnCopy.classList.remove('copied');
				}, 1500);
			};

			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(url).then(markCopied).catch(fallbackCopy);
			} else {
				fallbackCopy();
			}

			function fallbackCopy() {
				const ta = document.createElement('textarea');
				ta.value = url;
				ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				markCopied();
			}
		});
	}

	if (form) {
		form.addEventListener('submit', handleShorten);
	}
})();

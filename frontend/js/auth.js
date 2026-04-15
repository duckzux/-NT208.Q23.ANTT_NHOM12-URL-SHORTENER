// js/auth.js

// Xử lý Đăng ký
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Ngăn reload trang
        
        const email = document.getElementById('mail').value;
        const password = document.getElementById('pwd').value;
        const confirmPassword = document.getElementById('repwd').value;

        if (password !== confirmPassword) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }

        try {
            const response = await fetch('/api/auth/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Đăng ký thành công! Đang chuyển hướng...');
                window.location.href = 'signin.html';
            } else {
                alert(result.error || 'Đăng ký thất bại!');
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Lỗi kết nối đến server.');
        }
    });
}

// Xử lý Đăng nhập
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('mail').value;
        const password = document.getElementById('pwd').value;

        try {
            const response = await fetch('/api/auth/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Đăng nhập thành công!');
                // Chuyển hướng sang trang quản lý
                window.location.href = 'dashboard.html'; 
            } else {
                alert(result.error || 'Sai email hoặc mật khẩu!');
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Lỗi kết nối đến server.');
        }
    });
}
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    // Preconfigured credentials
    const correctUsername = 'Admin';
    const correctPassword = '123456';

    if (username === correctUsername && password === correctPassword) {
        // Secure session management (simplified for demonstration)
        // In a real application, you would use server-side sessions, JWTs, etc.
        sessionStorage.setItem('loggedIn', 'true');
        window.location.href = '/index.html'; // Redirect to dashboard
    } else {
        errorMessage.textContent = 'Invalid username or password.';
    }
});
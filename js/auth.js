/* js/auth.js: User registration and login logic */

$(function () {
  $('#auth-form').on('submit', function (event) {
    event.preventDefault();
    const username = $('#username').val().trim();
    const password = $('#password').val().trim();

    if (!username || !password) {
      alert('Please enter valid credentials.');
      return;
    }

    // Emulate server-side user store via LocalStorage
    const users = JSON.parse(localStorage.getItem('memoryGameUsers') || '[]');
    const existingUser = users.find((u) => u.username === username);

    if (existingUser) {
      // Check password
      if (existingUser.password === password) {
        localStorage.setItem('memoryGameUser', username);
        window.location.href = 'game.html';
      } else {
        alert('Incorrect password.');
      }
    } else {
      // Register new user
      users.push({ username, password });
      localStorage.setItem('memoryGameUsers', JSON.stringify(users));
      localStorage.setItem('memoryGameUser', username);
      window.location.href = 'game.html';
    }
  });
});

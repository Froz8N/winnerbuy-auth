document.addEventListener('DOMContentLoaded', function() {
    // Загрузка списка пользователей при загрузке страницы
    loadUsers();

    // Обработчик формы регистрации
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        
        registerUser(username, password);
    });

    // Обработчик формы сброса HWID
    document.getElementById('resetHwidForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('resetUsername').value;
        
        resetHwid(username);
    });

    // Обработчик кнопки обновления списка пользователей
    document.getElementById('refreshUsers').addEventListener('click', loadUsers);
});

// Функция для загрузки списка пользователей
function loadUsers() {
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';
            
            if (data.users.length === 0) {
                usersList.innerHTML = '<tr><td colspan="4" class="text-center">Нет зарегистрированных пользователей</td></tr>';
                return;
            }
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                
                // Логин
                const usernameCell = document.createElement('td');
                usernameCell.textContent = user.username;
                row.appendChild(usernameCell);
                
                // HWID
                const hwidCell = document.createElement('td');
                hwidCell.textContent = user.hwid;
                row.appendChild(hwidCell);
                
                // Дата регистрации
                const dateCell = document.createElement('td');
                dateCell.textContent = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Неизвестно';
                row.appendChild(dateCell);
                
                // Действия
                const actionsCell = document.createElement('td');
                const resetButton = document.createElement('button');
                resetButton.className = 'btn btn-sm btn-danger';
                resetButton.textContent = 'Сбросить HWID';
                resetButton.addEventListener('click', function() {
                    resetHwid(user.username);
                });
                actionsCell.appendChild(resetButton);
                row.appendChild(actionsCell);
                
                usersList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке пользователей:', error);
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Ошибка при загрузке пользователей</td></tr>';
        });
}

// Функция для регистрации нового пользователя
function registerUser(username, password) {
    const messageElement = document.getElementById('registerMessage');
    messageElement.innerHTML = '';
    
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            messageElement.innerHTML = `
                <div class="success-message">
                    ${data.message}
                </div>
            `;
            document.getElementById('registerForm').reset();
            loadUsers(); // Обновляем список пользователей
        } else {
            messageElement.innerHTML = `
                <div class="error-message">
                    ${data.message}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Ошибка при регистрации:', error);
        messageElement.innerHTML = `
            <div class="error-message">
                Ошибка при регистрации: ${error.message}
            </div>
        `;
    });
}

// Функция для сброса HWID пользователя
function resetHwid(username) {
    const messageElement = document.getElementById('resetMessage');
    messageElement.innerHTML = '';
    
    fetch('/api/reset-hwid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            messageElement.innerHTML = `
                <div class="success-message">
                    ${data.message}
                </div>
            `;
            document.getElementById('resetHwidForm').reset();
            loadUsers(); // Обновляем список пользователей
        } else {
            messageElement.innerHTML = `
                <div class="error-message">
                    ${data.message}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Ошибка при сбросе HWID:', error);
        messageElement.innerHTML = `
            <div class="error-message">
                Ошибка при сбросе HWID: ${error.message}
            </div>
        `;
    });
}

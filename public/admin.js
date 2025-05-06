document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    const token = localStorage.getItem('adminToken');
    if (!token) {
        // Перенаправление на страницу входа
        window.location.href = '/admin';
        return;
    }

    // Отображение информации о входе
    document.getElementById('adminInfo').innerHTML = '<span class="badge bg-success">Администратор</span>';

    // Обработчик выхода
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin';
    });

    // Загрузка списка пользователей при загрузке страницы
    loadUsers();

    // Обработчик формы регистрации
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        
        createUser(username, password);
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

// Функция для выполнения авторизованных запросов
function authorizedFetch(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin';
        return Promise.reject(new Error('Не авторизован'));
    }

    // Добавляем заголовок авторизации
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    
    return fetch(url, {
        ...options,
        headers
    }).then(response => {
        if (response.status === 401) {
            // Если токен недействителен, перенаправляем на страницу входа
            localStorage.removeItem('adminToken');
            window.location.href = '/admin';
            throw new Error('Сессия истекла');
        }
        return response;
    });
}

// Функция для загрузки списка пользователей
function loadUsers() {
    authorizedFetch('/api/users')
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
                
                // Кнопка сброса HWID
                const resetButton = document.createElement('button');
                resetButton.className = 'btn btn-sm btn-danger me-2';
                resetButton.textContent = 'Сбросить HWID';
                resetButton.addEventListener('click', function() {
                    resetHwid(user.username);
                });
                actionsCell.appendChild(resetButton);
                
                // Кнопка удаления
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-dark';
                deleteButton.textContent = 'Удалить';
                deleteButton.addEventListener('click', function() {
                    if (confirm(`Вы уверены, что хотите удалить пользователя ${user.username}?`)) {
                        deleteUser(user.username);
                    }
                });
                actionsCell.appendChild(deleteButton);
                
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

// Функция для создания нового пользователя
function createUser(username, password) {
    const messageElement = document.getElementById('registerMessage');
    messageElement.innerHTML = '';
    
    authorizedFetch('/api/admin/create-user', {
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
                <div class="alert alert-success">
                    ${data.message}
                </div>
            `;
            document.getElementById('registerForm').reset();
            loadUsers(); // Обновляем список пользователей
        } else {
            messageElement.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Ошибка при создании пользователя:', error);
        messageElement.innerHTML = `
            <div class="alert alert-danger">
                Ошибка при создании пользователя: ${error.message}
            </div>
        `;
    });
}

// Функция для сброса HWID пользователя
function resetHwid(username) {
    const messageElement = document.getElementById('resetMessage');
    messageElement.innerHTML = '';
    
    authorizedFetch('/api/reset-hwid', {
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
                <div class="alert alert-success">
                    ${data.message}
                </div>
            `;
            document.getElementById('resetHwidForm').reset();
            loadUsers(); // Обновляем список пользователей
        } else {
            messageElement.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Ошибка при сбросе HWID:', error);
        messageElement.innerHTML = `
            <div class="alert alert-danger">
                Ошибка при сбросе HWID: ${error.message}
            </div>
        `;
    });
}

// Функция для удаления пользователя
function deleteUser(username) {
    authorizedFetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            loadUsers(); // Обновляем список пользователей
        } else {
            alert(`Ошибка: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Ошибка при удалении пользователя:', error);
        alert(`Ошибка при удалении пользователя: ${error.message}`);
    });
}

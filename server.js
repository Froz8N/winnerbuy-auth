const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Конфигурация
const config = {
  // Админ-доступ (измените эти значения!)
  adminUsername: 'admin',
  // Хеш пароля 'admin123' (в реальном приложении используйте более сложный пароль)
  adminPasswordHash: 'e64c7d89f26bd1972efa854d13d7dd61',
  // Секретный ключ для сессий
  sessionSecret: 'winner-buy-secret-key-change-this',
  // Порт (Render.com использует переменную окружения PORT)
  port: process.env.PORT || 3000
};

// Инициализация приложения Express
const app = express();

// Настройка middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Простая сессионная система
const sessions = {};

// Middleware для проверки авторизации админа
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Требуется авторизация' });
  }
  
  // Проверка токена
  const token = authHeader.split(' ')[1];
  if (!token || !sessions[token] || sessions[token].expired < Date.now()) {
    return res.status(401).json({ success: false, message: 'Недействительный или истекший токен' });
  }
  
  // Пользователь авторизован
  next();
}

// Файл для хранения пользователей (вместо базы данных для простоты)
const USERS_FILE = path.join(__dirname, 'users.json');

// Инициализация файла пользователей, если он не существует
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }));
  console.log('Создан новый файл пользователей');
}

// Загрузка пользователей из файла
let usersData = { users: [] };
try {
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  usersData = JSON.parse(data);
} catch (err) {
  console.error('Ошибка при чтении файла пользователей:', err);
}

// Маршрут для авторизации администратора
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя и пароль' });
  }
  
  // Проверка учетных данных администратора
  const passwordHash = crypto.createHash('md5').update(password).digest('hex');
  
  if (username !== config.adminUsername || passwordHash !== config.adminPasswordHash) {
    return res.status(401).json({ success: false, message: 'Неверные учетные данные администратора' });
  }
  
  // Создание токена сессии
  const token = crypto.randomBytes(32).toString('hex');
  const expiresIn = 24 * 60 * 60 * 1000; // 24 часа
  
  // Сохранение сессии
  sessions[token] = {
    username,
    expired: Date.now() + expiresIn
  };
  
  return res.json({
    success: true,
    message: 'Авторизация успешна',
    token,
    expiresIn
  });
});

// Маршруты API для клиента (не требуют авторизации)
app.post('/api/login', (req, res) => {
  const { username, password, hwid } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя и пароль' });
  }
  
  // Поиск пользователя
  const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Пользователь не найден' });
  }
  
  // Проверка пароля
  if (user.password !== password) {
    return res.status(401).json({ success: false, message: 'Неверный пароль' });
  }
  
  // Проверка HWID
  if (user.hwid && user.hwid !== hwid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Этот аккаунт привязан к другому устройству',
      currentHwid: user.hwid,
      providedHwid: hwid
    });
  }
  
  // Если HWID еще не привязан, привязываем его
  if (!user.hwid) {
    user.hwid = hwid;
    // Сохраняем изменения в файл
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
    console.log(`HWID привязан к аккаунту ${username}: ${hwid}`);
  }
  
  // Успешная авторизация
  return res.json({ 
    success: true, 
    message: 'Авторизация успешна',
    user: {
      username: user.username,
      hwid: user.hwid
    }
  });
});

app.post('/api/register', (req, res) => {
  const { username, password, hwid } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя и пароль' });
  }
  
  // Проверка, существует ли пользователь
  const existingUser = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Пользователь с таким именем уже существует' });
  }
  
  // Создание нового пользователя
  const newUser = {
    username,
    password,
    hwid,
    createdAt: new Date().toISOString()
  };
  
  // Добавление пользователя в массив
  usersData.users.push(newUser);
  
  // Сохранение в файл
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  
  console.log(`Зарегистрирован новый пользователь: ${username}`);
  
  return res.json({ 
    success: true, 
    message: 'Регистрация успешна',
    user: {
      username: newUser.username,
      hwid: newUser.hwid
    }
  });
});

// Маршруты API для админ-панели (требуют авторизации)
app.get('/api/users', requireAdminAuth, (req, res) => {
  const safeUsers = usersData.users.map(user => ({
    username: user.username,
    hwid: user.hwid ? user.hwid.substring(0, 8) + '...' : 'Не привязан',
    createdAt: user.createdAt
  }));
  
  return res.json({ users: safeUsers });
});

app.post('/api/reset-hwid', requireAdminAuth, (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя' });
  }
  
  // Поиск пользователя
  const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'Пользователь не найден' });
  }
  
  // Сброс HWID
  const oldHwid = user.hwid;
  user.hwid = '';
  
  // Сохранение в файл
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  
  console.log(`Сброшен HWID для пользователя ${username}. Старый HWID: ${oldHwid}`);
  
  return res.json({ 
    success: true, 
    message: `HWID для пользователя ${username} успешно сброшен`
  });
});

// Маршрут для создания пользователя администратором
app.post('/api/admin/create-user', requireAdminAuth, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя и пароль' });
  }
  
  // Проверка, существует ли пользователь
  const existingUser = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Пользователь с таким именем уже существует' });
  }
  
  // Создание нового пользователя
  const newUser = {
    username,
    password,
    hwid: '',
    createdAt: new Date().toISOString()
  };
  
  // Добавление пользователя в массив
  usersData.users.push(newUser);
  
  // Сохранение в файл
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  
  console.log(`Администратор создал нового пользователя: ${username}`);
  
  return res.json({ 
    success: true, 
    message: 'Пользователь успешно создан',
    user: {
      username: newUser.username
    }
  });
});

// Маршрут для удаления пользователя
app.post('/api/admin/delete-user', requireAdminAuth, (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, message: 'Необходимо указать имя пользователя' });
  }
  
  // Поиск индекса пользователя
  const userIndex = usersData.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Пользователь не найден' });
  }
  
  // Удаление пользователя
  const deletedUser = usersData.users.splice(userIndex, 1)[0];
  
  // Сохранение в файл
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  
  console.log(`Администратор удалил пользователя: ${username}`);
  
  return res.json({ 
    success: true, 
    message: `Пользователь ${username} успешно удален`
  });
});

// Маршрут для главной страницы (админ-панель)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для страницы входа администратора
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Запуск сервера
app.listen(config.port, () => {
  console.log(`Сервер запущен на порту ${config.port}`);
});

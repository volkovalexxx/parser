// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Импортируем пакет cors
const crawl = require('./crawler');

const app = express();
const PORT = process.env.PORT || 7777;

app.use(cors()); // Разрешаем CORS для всех маршрутов
app.use(express.json());

// Эндпоинт для получения информации о товаре
app.post('/link', async (req, res) => {
    const { link } = req.body;

    if (!link) {
        return res.status(400).json({ error: 'Link is required' });
    }

    // Очищаем ссылку
    const url = new URL(link);
    const cleanedLink = `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
    console.log(`Received link: ${cleanedLink}`);

    // Генерируем уникальный ID
    const id = Date.now().toString();
    console.log(`Generated ID: ${id}`);

    // Создаем запись в JSON-файле
    const filePath = path.join(__dirname, 'data.json');
    let jsonData = {};

    // Проверяем, существует ли файл и читаем его
    if (fs.existsSync(filePath)) {
        try {
            jsonData = JSON.parse(fs.readFileSync(filePath));
        } catch (error) {
            console.error('Error reading JSON file:', error);
            return res.status(500).json({ error: 'Failed to read data file' });
        }
    }

    jsonData[id] = { status: 'crawling' }; // Устанавливаем статус как "в процессе"
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

    // Отправляем ID пользователю
    res.json({ id });

    // Запускаем crawler с очищенной ссылкой
    const maxRetries = 3; // Максимальное количество попыток
    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
        try {
            await crawl(cleanedLink, id);
            success = true; // Если парсинг прошел успешно, выходим из цикла
        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed: ${error.message}`);
            if (attempts < maxRetries) {
                console.log('Retrying...');
            } else {
                console.error('Max retries reached. Giving up.');
            }
        }
    }
});

// Эндпоинт для получения спаршенной информации
app.get('/getinfo', (req, res) => {
    const { id } = req.query; // Изменено на req.query для получения параметра из URL

    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    const filePath = path.join(__dirname, 'data.json');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Data not found' });
    }

    let jsonData;
    try {
        jsonData = JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        console.error('Error reading JSON file:', error);
        return res.status(500).json({ error: 'Failed to read data file' });
    }

    const data = jsonData[id];

    if (!data) {
        return res.status(404).json({ error: 'No data found for this ID' });
    }

    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

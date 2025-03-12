// crawler.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function crawl(link, id) {
    console.log(`Starting crawl for link: ${link} with ID: ${id}`);
    
    const cleanedLink = link.split('?')[0] + '?' + new URLSearchParams(new URL(link).search).toString();
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Устанавливаем пользовательский User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log(`Navigating to: ${cleanedLink}`);
    try {
        await page.goto(cleanedLink, { waitUntil: 'networkidle2' });
        console.log(`Successfully navigated to: ${cleanedLink}`);
    } catch (error) {
        console.error(`Failed to navigate to ${cleanedLink}:`, error);
        await browser.close();
        return;
    }

    // Ожидаем, пока загрузится элемент, который мы хотим парсить
    try {
        await page.waitForSelector('.item-user-info-avatar--cQHQppKw img', { timeout: 5000 });
        console.log('Required elements are loaded.');
    } catch (error) {
        console.error('Required elements did not load in time:', error);
        await browser.close();
        return;
    }

    // Получаем HTML-код страницы
    const content = await page.content();
    const $ = require('cheerio').load(content);

    // Парсим данные
    const sellerAvatar = $('.item-user-info-avatar--cQHQppKw img').attr('src') || '';
    const sellerNickname = $('.item-user-info-nick--rtpDhkmQ').text().trim() || '';
    const userInfoLabels = $('.item-user-info-label--NLTMHARN');
    const city = $(userInfoLabels[0]).text().trim() || '';
    const lastOnline = $(userInfoLabels[1]).text().trim() || '';
    const additionalInfo = $(userInfoLabels[2]).text().trim() || '';
    const salesCount = $(userInfoLabels[3]).text().trim() || '';
    const sellerRating = $(userInfoLabels[4]).text().trim() || '';
    const price = $('.price--OEWLbcxC').text().trim() || '';
    const description = $('.desc--GaIUKUQY').text().trim() || '';
    const category = $('.item--qI9ENIfp .label--ejJeaTRV div div').first().text().trim() || '';
    const categoryDescription = $('.item--qI9ENIfp .value--EyQBSInp').text().trim() || '';

    // Извлекаем изображения
    const images = [];
    $('.item-main-window-list--od7DK4Fm img').each((i, elem) => {
        const imgSrc = $(elem).attr('src');
        if (imgSrc) {
            images.push(imgSrc);
            console.log(`Found image: ${imgSrc}`);
        }
    });

    // Извлекаем данные из want--ecByv3Sr
    const inFavorite = $('.want--ecByv3Sr div').first().text().trim() || ''; // 9人想要
    const seeNum = $('.want--ecByv3Sr div').last().text().trim() || ''; // 214浏览

    // Логируем найденные данные
    console.log(`Found seller avatar: ${sellerAvatar}`);
    console.log(`Found seller nickname: ${sellerNickname}`);
    console.log(`Found city: ${city}`);
    console.log(`Found last online info: ${lastOnline}`);
    console.log(`Found additional info: ${additionalInfo}`);
    console.log(`Found sales count: ${salesCount}`);
    console.log(`Found seller rating: ${sellerRating}`);
    console.log(`Found price: ${price}`);
    console.log(`Found description: ${description}`);
    console.log(`Found category: ${category}`);
    console.log(`Found category description: ${categoryDescription}`);
    console.log(`Found inFavorite: ${inFavorite}`);
    console.log(`Found seeNum: ${seeNum}`);

    // Сохраняем данные в JSON-файл
    const filePath = path.join(__dirname, 'data.json');
    let jsonData = {};

    if (fs.existsSync(filePath)) {
        try {
            jsonData = JSON.parse(fs.readFileSync(filePath));
        } catch (error) {
            console.error('Error reading JSON file:', error);
        }
    }

    jsonData[id] = {
        sellerAvatar,
        sellerNickname,
        city,
        lastOnline,
        additionalInfo,
        salesCount,
        sellerRating,
        price,
        description,
        category,
        categoryDescription,
        images,
        inFavorite, // Добавляем inFavorite
        seeNum // Добавляем seeNum
    };

    try {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`Data saved for ID: ${id}`);
    } catch (error) {
        console.error('Error writing to JSON file:', error);
    }

    await browser.close();
}

module.exports = crawl;
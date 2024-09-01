document.addEventListener('DOMContentLoaded', async () => {
    const searchBox = document.getElementById('searchBox');
    const resultDiv = document.getElementById('result');
    const ghostText = document.getElementById('ghostText');
    const searchContainer = document.querySelector('.search-box');
    const wordCountElement = document.getElementById('wordCount');

    let dictionaryData = {};
    let lastQuery = '';
    let hasError = false;
    let inputHasError = false;

    try {
        const response = await fetch('vocabulary.json');
        if (!response.ok) {
            throw new Error('Yoksa bir yerlerde bir harf mi kayıp?');
        }
        dictionaryData = await response.json();

        const wordCount = Object.keys(dictionaryData).length;
        wordCountElement.innerHTML = `Türk dilinin <span class="highlight">${wordCount}</span> maddelik arkeolojisi.`;
    } catch (error) {
        console.error('Yoksa bir yerlerde bir harf mi kayıp?', error);
        hasError = true;

        wordCountElement.innerHTML = `<p class="error-message">Yoksa bir yerlerde bir harf mi kayıp?</p>`;

        searchContainer.classList.add('error');
        resultDiv.classList.add('hidden');
        ghostText.classList.add('hidden');
    }

    function searchWord(query) {
        if (query === lastQuery) {
            return;
        }
        lastQuery = query;

        resultDiv.innerHTML = '';

        if (query.trim().length === 0) {
            if (query.length > 0) {
                // Sadece space karakterleri var
                searchContainer.classList.add('error');
                searchBox.style.color = '#dc3545'; // Kırmızı text rengi
                inputHasError = true;
            } else {
                // Tamamen boş
                searchContainer.classList.remove('error');
                searchBox.style.color = '#32CD32'; // Yeşil text rengi
                inputHasError = false;
            }
            ghostText.textContent = "";
            return;
        } else {
            searchContainer.classList.remove('error');
            searchBox.style.color = '#f0f0f0'; // Normal text rengi
            inputHasError = false;
        }

        const normalizedQuery = normalizeTurkish(query);

        const sortedWords = Object.keys(dictionaryData)
            .map(word => ({ word: normalizeTurkish(word), original: word }))
            .sort((a, b) => a.word.localeCompare(b.word));

        const closestWord = sortedWords
            .find(({ word }) => word.startsWith(normalizedQuery));

        if (closestWord) {
            const wordDetails = dictionaryData[closestWord.original];
            const description = wordDetails.a.replace(/\n/g, "<br>");
            const descriptionElement = document.createElement('p');
            descriptionElement.classList.add('description');
            descriptionElement.innerHTML = highlightWords(sanitizeHTML(description));
            resultDiv.appendChild(descriptionElement);

            const descriptionHeight = descriptionElement.offsetHeight;
            descriptionElement.style.maxHeight = `${descriptionHeight}px`;

            ghostText.textContent = closestWord.word.substring(query.length);
        } else {
            ghostText.textContent = "";
            searchContainer.classList.add('error');
            searchBox.style.color = '#dc3545'; // Kırmızı text rengi
            inputHasError = true;
        }

        resultDiv.style.animation = 'none';
        resultDiv.offsetHeight;
        resultDiv.style.animation = 'fadeIn 1s ease-in-out';
    }

    function normalizeTurkish(text) {
        return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
    }

    function sanitizeHTML(htmlString) {
        return DOMPurify.sanitize(htmlString, {
            ALLOWED_TAGS: ['b', 'span', 'i', 'em', 'strong', 'a', 'br'],
            ALLOWED_ATTR: ['href', 'class'],
        });
    }

    function highlightWords(text) {
        const specialWords = {
            '01': 'Ana Yalnıkça',
            '02': 'Ana Türkçe',
            '03': 'Çocuk Ağzı',
            '04': 'Çakılmalı',
            '05': 'Yad',
            '06': 'Türkçe',
        };

        let markedText = text;
        for (const [key, value] of Object.entries(specialWords)) {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            markedText = markedText.replace(regex, (match) => `[SPECIAL:${key}]`);
        }

        let resultText = markedText;
        for (const [key, value] of Object.entries(specialWords)) {
            const regex = new RegExp(`\\[SPECIAL:${key}\\](\\s+)(\\S+)`, 'gi');
            resultText = resultText.replace(regex, (match, p1, p2) => `<b>${value}</b>${p1}<span class="purple">${p2}</span>`);
        }

        resultText = resultText.replace(/\[SPECIAL:\S+\]/g, '');

        return resultText;
    }

    function updateSearchBoxPlaceholder(query) {
        const queryLower = normalizeTurkish(query);
        const matchingWord = Object.keys(dictionaryData)
            .map(word => ({ word: normalizeTurkish(word), original: word }))
            .sort((a, b) => a.word.localeCompare(b.word))
            .find(({ word }) => word.startsWith(queryLower));

        if (matchingWord) {
            const remainingPart = matchingWord.word.substring(query.length);
            ghostText.textContent = remainingPart;

            const inputRect = searchBox.getBoundingClientRect();
            const inputStyle = window.getComputedStyle(searchBox);
            const paddingLeft = parseFloat(inputStyle.paddingLeft);
            const fontSize = parseFloat(inputStyle.fontSize);

            const firstCharWidth = getTextWidth(query, fontSize);
            ghostText.style.left = `${paddingLeft + firstCharWidth}px`;
        } else {
            ghostText.textContent = "";
        }
    }

    function getTextWidth(text, fontSize) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px 'Poppins', sans-serif`;
        return context.measureText(text).width;
    }

    searchBox.addEventListener('input', () => {
        const query = searchBox.value;
        if (query.trim().length === 0 && query.length > 0) {
            // Sadece space karakterleri var
            searchContainer.classList.add('error');
            searchBox.style.color = '#dc3545'; // Kırmızı text rengi
            inputHasError = true;
        } else if (query.length === 0) {
            // Tamamen boş
            searchContainer.classList.remove('error');
            searchBox.style.color = '#32CD32'; // Yeşil text rengi
            inputHasError = false;
        } else {
            searchContainer.classList.remove('error');
            searchBox.style.color = '#f0f0f0'; // Normal text rengi
            inputHasError = false;
        }
        updateSearchBoxPlaceholder(query);
        searchWord(query);
    });

    searchBox.addEventListener('keydown', () => {
        if (inputHasError) {
            searchContainer.classList.add('error');
        } else {
            searchContainer.classList.remove('error');
        }
    });

    searchBox.addEventListener('blur', () => {
        searchContainer.classList.remove('error');
    });

    searchBox.addEventListener('focus', () => {
        if (inputHasError) {
            searchContainer.classList.add('error');
        }
    });

    // Initial state of search box
    const initialQuery = searchBox.value;
    if (initialQuery.trim().length === 0) {
        searchContainer.classList.add('empty');
    }
});

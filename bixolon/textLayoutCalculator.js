const opentype = require('opentype.js');
const hyphen = require('hyphen');
const ru = require('hyphen/ru');

async function calculateTextLayout(
    text,           // исходный текст
    fontSize,       // размер шрифта в пунктах (points)
    blockWidth,     // ширина блока в точках (points) при 203 DPI
    isBold = false, // жирный текст
    isItalic = false, // курсив
    isCentered = false, // центрирование
    fontName = 'Arial', // название шрифта или путь к файлу
    useHyphenation = true, // флаг использования переносов
    isRighted = false // флаг выравнивания по правому краю
) {
    // Инициализация модуля переносов для русского языка
    const hyphenate = ru.hyphenateSync || hyphen(ru.patterns, {
        hyphenChar: '\u00AD',   // мягкий дефис (символ переноса)
        minWordLength: 5,  // минимальная длина слова для переноса
    });

    // Функция для получения оптимальных частей слова с учетом ширины блока
    function getOptimalHyphenatedParts(word, blockWidth, fontSize, font) {
        if (!useHyphenation || word.length < 5) {
            return [word]; // слово слишком короткое для переноса
        }

        const hyphenated = hyphenate(word);
        const allParts = hyphenated.split('\u00AD');

        if (allParts.length <= 1) {
            return [word];
        }

        // Создаем возможные комбинации частей с минимальной длиной 3 символа для оставшейся части
        const result = [];
        let currentPart = '';

        for (let i = 0; i < allParts.length; i++) {
            const part = allParts[i];

            // Проверяем, можно ли добавить эту часть к текущей
            const testPart = currentPart ? currentPart + part : part;
            const testWidth = calculateTextWidth(testPart, fontSize, font);

            // Проверяем, достаточно ли оставшихся частей для формирования оставшейся части слова длиной не менее 3 символов
            const remainingPartsCount = allParts.length - i - 1;
            const minRemainingLength = remainingPartsCount > 0 ? 3 : 0; // минимум 3 символа для оставшейся части

            // Если текущая часть помещается и оставшиеся части могут образовать допустимую оставшуюся часть
            if (testWidth <= blockWidth) {
                if (i === allParts.length - 1) {
                    // Это последняя часть
                    result.push(testPart);
                    currentPart = '';
                } else {
                    // Проверяем, будет ли оставшаяся часть слова достаточно длинной
                    const remainingPart = allParts.slice(i + 1).join('');
                    if (remainingPart.length >= minRemainingLength) {
                        currentPart = testPart;
                    } else {
                        // Добавляем текущую накопленную часть
                        if (currentPart) {
                            result.push(currentPart);
                        }
                        // И начинаем новую часть
                        currentPart = part;
                    }
                }
            } else {
                // Текущая часть не помещается, добавляем накопленную часть
                if (currentPart) {
                    result.push(currentPart);
                }
                // Проверяем, помещается ли сама часть
                if (calculateTextWidth(part, fontSize, font) <= blockWidth) {
                    currentPart = part;
                } else {
                    // Если даже отдельная часть не помещается, разбиваем по символам
                    return splitWordByCharacters(word, blockWidth, fontSize, font, []);
                }
            }
        }

        if (currentPart) {
            result.push(currentPart);
        }

        return result;
    }

    // Загружаем шрифт
    let font;

    try {
        // Примеры путей для стандартных шрифтов Windows
        const fontPaths = {
            'Arial': './bixolon/fonts/ARIAL.TTF',
            'Arial Bold': './bixolon/fonts/ARIALBD.TTF',
            'Arial Italic': './bixolon/fonts/ARIALI.TTF',
            'Arial Bold Italic': './bixolon/fonts/ARIALBI.TTF',
            'Arial Narrow': './bixolon/fonts/ARIALN.TTF',
            'Arial Narrow Bold': './bixolon/fonts/ARIALNB.TTF',
            'Arial Narrow Bold Italic': './bixolon/fonts/ARIALNBI.TTF',
            'Arial Narrow Italic': './bixolon/fonts/ARIALNI.TTF',
            'Arial Black': './bixolon/fonts/ARIBLK.TTF',
            'Courier New': './bixolon/fonts/COUR.TTF',
            'Courier New Bold': './bixolon/fonts/COURBD.TTF',
            'Courier New Bold Italic': './bixolon/fonts/COURBI.TTF',
            'Courier New Italic': './bixolon/fonts/COURI.TTF',
            'Georgia': './bixolon/fonts/GEORGIA.TTF',
            'Georgia Bold': './bixolon/fonts/GEORGIAB.TTF',
            'Georgia Italic': './bixolon/fonts/GEORGIAI.TTF',
            'Georgia Bold Italic': './bixolon/fonts/GEORGIAZ.TTF',
            'Helvetica': './bixolon/fonts/helvetica_regular.otf',
            'Helvetica Bold': './bixolon/fonts/helvetica_bold.otf',
            'Helvetica Italic': './bixolon/fonts/helvetica_oblique.otf',
            'Helvetica Bold Italic': './bixolon/fonts/helvetica_boldoblique.otf',
            'Helvetica Light': './bixolon/fonts/helvetica_light.otf',
            'Helvetica Light Italic': './bixolon/fonts/helvetica_lightoblique.otf',
            'Helvetica Cyrillic Italic': './bixolon/fonts/helvetica_cyr_oblique.ttf',
            'Helvetica Cyrillic Bold Italic': './bixolon/fonts/helvetica_cyr_boldoblique.ttf',
            'Times New Roman': './bixolon/fonts/TIMES.TTF',
            'Times New Roman Bold': './bixolon/fonts/TIMESBD.TTF',
            'Times New Roman Italic': './bixolon/fonts/TIMESI.TTF',
            'Times New Roman Bold Italic': './bixolon/fonts/TIMESBI.TTF',
            'Verdana': './bixolon/fonts/VERDANA.TTF',
            'Verdana Bold': './bixolon/fonts/VERDANAB.TTF',
            'Verdana Italic': './bixolon/fonts/VERDANAI.TTF',
            'Verdana Bold Italic': './bixolon/fonts/VERDANAZ.TTF'
        };

        let fontPath;
        if (isBold && isItalic && fontPaths[`${fontName} Bold Italic`]) {
            fontPath = fontPaths[`${fontName} Bold Italic`];
        } else if (isBold && fontPaths[`${fontName} Bold`]) {
            fontPath = fontPaths[`${fontName} Bold`];
        } else if (isItalic && fontPaths[`${fontName} Italic`]) {
            fontPath = fontPaths[`${fontName} Italic`];
        } else if (fontPaths[`${fontName}`]) {
            fontPath = fontPaths[`${fontName}`];
        } else if (fontName.includes('.ttf') || fontName.includes('.TTF') || fontName.includes('.otf') || fontName.includes('.OTF')) {
            // Если передан путь к файлу
            fontPath = fontName;
        } else {
            throw new Error(`Шрифт ${fontName} не найден. Укажите полный путь к .ttf файлу.`);
        }

        font = await new Promise((resolve, reject) => {
            opentype.load(fontPath, (err, f) => {
                if (err) {
                    console.warn(`Не удалось загрузить шрифт ${fontPath}:`, err.message);
                    reject(err);
                } else {
                    console.log(`Шрифт загружен: ${fontPath}`);
                    resolve(f);
                }
            });
        });
    } catch (error) {
        console.warn('Использую резервный метод расчета...');
        return calculateWithFallback(text, fontSize, blockWidth, isBold, isItalic, isCentered, useHyphenation, isRighted);
    }

    // Функция для расчета ширины текста
    function calculateTextWidth(text, fontSize, font) {
        if (!font || !text || typeof text !== 'string') return 0; // Защита от undefined

        const scale = fontSize / 72;
        const fontUnitsPerPoint = font.unitsPerEm * scale;

        let totalWidth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const glyph = font.charToGlyph(char);

            if (glyph) {
                const glyphWidth = glyph.advanceWidth || 0;
                totalWidth += (glyphWidth / font.unitsPerEm) * fontSize;
            } else {
                totalWidth += fontSize * 0.5;
            }
        }

        console.log(`Ширина текста "${text}" в пикселях: ${totalWidth}`);

        return totalWidth;
    }

    // Разбивка текста на строки с поддержкой переносов
    function splitTextIntoLines(text, blockWidth, fontSize, font) {
        // Сначала разбиваем по символам новой строки
        const textParts = text.split('\n');
        const allLines = [];
        
        for (let partIndex = 0; partIndex < textParts.length; partIndex++) {
            const part = textParts[partIndex];
            
            // Для каждой части, разделяем по пробелам
            const words = part.split(/\s+/).filter(word => word.length > 0); // Разделяем по пробелам и убираем пустые строки
            const lines = [];
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
                let word = words[i];
                if (!word || word.length === 0) continue; // Пропускаем пустые или undefined слова
                word = word.trim(); // Убираем пробелы
                if (word.length === 0) continue; // Проверяем снова после trim

                // Пробуем добавить целое слово
                if (!word || word.length === 0) continue; // Защита на случай, если слово пустое
                if (!currentLine) currentLine = ''; // Защита от undefined
                const testLineFull = currentLine ? `${currentLine} ${word}` : word;
                if (!testLineFull || testLineFull.length === 0) continue; // Защита от undefined или пустой строки
                const testWidthFull = calculateTextWidth(testLineFull, fontSize, font);

                if (!testLineFull || testLineFull.length === 0) continue; // Защита от undefined или пустой строки
                if (testWidthFull <= blockWidth) {
                    // Целое слово помещается
                    currentLine = testLineFull;
                } else {
                    // Слово не помещается целиком
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = '';
                    }

                    // Пробуем поместить целое слово в новую строку
                    console.log(`Слово "${word}" не помещается целиком. Пытаемся поместить целое слово в новую строку...`);
                    if (!word || word.length === 0) continue; // Защита от undefined или пустого слова
                    const wordWidth = calculateTextWidth(word, fontSize, font) || 0; // Защита от undefined результата
                    console.log(`Ширина слова "${word}": ${wordWidth}`);
                    if (wordWidth <= blockWidth) {
                        currentLine = word;
                    } else {
                        // Слово слишком длинное, пробуем оптимальные переносы
                        console.log(`Слово "${word}" слишком длинное для блока. Пытаемся оптимальные переносы...`);

                        const optimalParts = getOptimalHyphenatedParts(word, blockWidth, fontSize, font);

                        console.log(`Оптимальные части для слова "${word}":`, optimalParts);
                        if (!optimalParts || optimalParts.length === 0) continue; // Защита от undefined или пустого массива
                        if (optimalParts.length === 1) {
                            // Если слово не может быть разбито, добавляем его как есть
                            currentLine = optimalParts[0];
                        } else {
                            // Добавляем оптимальные части слова
                            for (let j = 0; j < optimalParts.length; j++) {
                                // Для всех частей, кроме последней, добавляем дефис, если часть переходит на следующую строку
                                const isLastPart = (j === optimalParts.length - 1);
                                const part = optimalParts[j];
                                const partWithHyphen = !isLastPart ? part + '-' : part;
                                const partWidth = calculateTextWidth(partWithHyphen, fontSize, font);

                                if (partWidth <= blockWidth) {
                                    // Эта часть помещается
                                    if (!isLastPart) {
                                        // Промежуточная часть - добавляем в строки с дефисом
                                        lines.push(partWithHyphen);
                                    } else {
                                        // Последняя часть - добавляем в текущую строку
                                        currentLine = part;
                                    }
                                } else {
                                    // Даже часть с дефисом не помещается, разбиваем по символам
                                    splitWordByCharacters(word, blockWidth, fontSize, font, lines);
                                    currentLine = '';
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Добавляем последнюю строку
            if (currentLine) {
                lines.push(currentLine);
            }
            
            // Добавляем все строки из этой части в общий массив
            allLines.push(...lines);
        }

        // После формирования строк, проверяем, можно ли улучшить выравнивание
        return improveTextAlignment(allLines, blockWidth, fontSize, font, useHyphenation);
    }

    // Функция для улучшения выравнивания текста
    function improveTextAlignment(lines, blockWidth, fontSize, font, useHyphenation) {
        // Отключаем улучшение выравнивания, если используются переносы
        if (useHyphenation || lines.length < 2) {
            // Если строк меньше 2 или используются переносы, нечего улучшать
            return lines;
        }

        const improvedLines = [...lines];
        const twoThirdsWidth = blockWidth * 2 / 3;

        for (let i = 0; i < improvedLines.length - 1; i++) {
            const currentLine = improvedLines[i];
            // Убираем пробелы в начале для проверки длины
            const currentLineWithoutLeadingSpaces = currentLine.trimStart();
            const currentLineWidth = calculateTextWidth(currentLineWithoutLeadingSpaces, fontSize, font);
            
            // Пропускаем улучшение, если текущая строка содержит дефис в конце
            if (currentLine.endsWith('-')) {
                continue;
            }

            // Проверяем, если строка без пробелов в начале занимает менее 2/3 ширины блока
            if (currentLineWidth < twoThirdsWidth) {
                // Проверяем следующую строку на наличие слова, которое можно "забрать" часть
                const nextLine = improvedLines[i + 1];

                if (nextLine && nextLine.length > 0) {
                    // Проверяем, начинается ли следующая строка со слова, которое можно частично перенести
                    const wordsInNextLine = nextLine.split(/\s+/);
                    if (wordsInNextLine.length > 0) {
                        const firstWord = wordsInNextLine[0];

                        // Проверяем, является ли первое слово достаточно длинным для переноса
                        if (firstWord.length >= 5 && useHyphenation && !firstWord.includes('-')) {
                            // Используем алгоритм переносов для получения частей слова
                            const hyphenated = hyphenate(firstWord);
                            const allParts = hyphenated.split('\u00AD');

                            if (allParts.length > 1) {
                                // Пробуем добавить первую часть следующего слова к текущей строке
                                const firstPart = allParts[0];
                                const remainingPart = allParts.slice(1).join('');

                                // Проверяем, помещается ли первая часть в текущую строку
                                const testLine = currentLine ? `${currentLine} ${firstPart}` : firstPart;
                                const testLineWidth = calculateTextWidth(testLine, fontSize, font);

                                if (testLineWidth <= blockWidth) {
                                    // Можем добавить часть слова к текущей строке
                                    improvedLines[i] = testLine;

                                    // Обновляем следующую строку, заменив первое слово оставшейся частью
                                    const remainingWords = [remainingPart, ...wordsInNextLine.slice(1)].filter(part => part !== '');
                                    improvedLines[i + 1] = remainingWords.join(' ');
                                }
                            }
                        }
                    }
                }
            }
        }

        return improvedLines;
    }

    // Вспомогательная функция для разбивки слова по символам
    function splitWordByCharacters(word, blockWidth, fontSize, font, lines) {
        let currentPart = '';

        for (let j = 0; j < word.length; j++) {
            const char = word[j];
            const testPart = currentPart + char;
            const partWidth = calculateTextWidth(testPart, fontSize, font);

            if (partWidth <= blockWidth) {
                currentPart = testPart;
            } else {
                if (currentPart) {
                    lines.push(currentPart);
                }
                currentPart = char;
            }
        }

        if (currentPart) {
            lines.push(currentPart);
        }
    }

    // Центрирование строк
    function centerLines(lines, blockWidth, fontSize, font) {
        if (!isCentered && !isRighted) return lines;

        const centeredLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWidth = calculateTextWidth(line, fontSize, font);

            if (lineWidth < blockWidth) {
                // Вычисляем отступ для центрирования
                const spaceWidth = calculateTextWidth(' ', fontSize, font);
                const totalSpacesWidth = blockWidth - lineWidth;
                const spacesCount = Math.floor(totalSpacesWidth / (2 * spaceWidth));

                // Добавляем пробелы в начало строки
                var spaces = '';
                if (isCentered) spaces = ' '.repeat(Math.max(0, spacesCount));
                else if (isRighted) spaces = ' '.repeat(Math.max(0, spacesCount * 2));
                centeredLines.push(spaces + line);
            } else {
                centeredLines.push(line);
            }
        }

        return centeredLines;
    }

    // Рассчитываем высоту строки
    let lineHeight;
    if (font) {
        const ascent = font.ascender / font.unitsPerEm * fontSize;
        const descent = Math.abs(font.descender) / font.unitsPerEm * fontSize;
        lineHeight = (ascent + descent) * 1.2;
    } else {
        lineHeight = fontSize * 1.2;
    }

    // Разбиваем текст на строки
    let lines = splitTextIntoLines(text, blockWidth, fontSize, font);

    // Центрируем строки, если нужно
    lines = centerLines(lines, blockWidth, fontSize, font);

    // Убираем лишние пробелы в начале строк (если не центрирование)
    if (!isCentered && !isRighted) {
        lines = lines.map(line => line.trimStart());
    }

    return {
        lines: lines,
        lineHeight: lineHeight,
        fontSize: fontSize,
        blockWidth: blockWidth,
        useHyphenation: useHyphenation,
        fontMetrics: font ? {
            ascender: font.ascender / font.unitsPerEm * fontSize,
            descender: font.descender / font.unitsPerEm * fontSize,
            lineGap: font.lineGap / font.unitsPerEm * fontSize
        } : null
    };
}

// Резервная функция
function calculateWithFallback(text, fontSize, blockWidth, isBold, isItalic, isCentered, useHyphenation, isRighted) {
    console.log('Использую резервный метод расчета с поддержкой переносов');

    // Инициализация переносов для резервного метода
    const hyphenate = ru.hyphenateSync || hyphen(ru.patterns, {
        hyphenChar: '\u00AD',
        minWordLength: 5,
    });

    function getHyphenatedWord(word) {
        if (!useHyphenation || word.length < 5) {
            return [word];
        }

        const hyphenated = hyphenate(word);
        const parts = hyphenated.split('\u00AD');

        if (parts.length > 1) {
            const result = [];
            for (let i = 0; i < parts.length; i++) {
                if (i < parts.length - 1) {
                    if (i < parts.length - 1) {
                        result.push(parts[i] + '-');
                    } else {
                        result.push(parts[i]);
                    }
                } else {
                    result.push(parts[i]);
                }
            }
            return result;
        }

        return [word];
    }

    // Функция для получения оптимальных частей слова с учетом ширины блока (для резервного метода)
    function getOptimalHyphenatedParts(word, blockWidth) {
        if (!useHyphenation || word.length < 5) {
            return [word]; // слово слишком короткое для переноса
        }

        const hyphenated = hyphenate(word);
        const allParts = hyphenated.split('\u00AD');

        if (allParts.length <= 1) {
            return [word];
        }

        // Создаем возможные комбинации частей с минимальной длиной 3 символа для оставшейся части
        const result = [];
        let currentPart = '';

        for (let i = 0; i < allParts.length; i++) {
            const part = allParts[i];

            // Проверяем, можно ли добавить эту часть к текущей
            const testPart = currentPart ? currentPart + part : part;
            const testWidth = calculateTextWidth(testPart);

            // Проверяем, достаточно ли оставшихся частей для формирования оставшейся части слова длиной не менее 3 символов
            const remainingPartsCount = allParts.length - i - 1;
            const minRemainingLength = remainingPartsCount > 0 ? 3 : 0; // минимум 3 символа для оставшейся части

            // Если текущая часть помещается и оставшиеся части могут образовать допустимую оставшуюся часть
            if (testWidth <= blockWidth) {
                if (i === allParts.length - 1) {
                    // Это последняя часть
                    result.push(testPart);
                    currentPart = '';
                } else {
                    // Проверяем, будет ли оставшаяся часть слова достаточно длинной
                    const remainingPart = allParts.slice(i + 1).join('');
                    if (remainingPart.length >= minRemainingLength) {
                        currentPart = testPart;
                    } else {
                        // Добавляем текущую накопленную часть
                        if (currentPart) {
                            result.push(currentPart);
                        }
                        // И начинаем новую часть
                        currentPart = part;
                    }
                }
            } else {
                // Текущая часть не помещается, добавляем накопленную часть
                if (currentPart) {
                    result.push(currentPart);
                }
                // Проверяем, помещается ли сама часть
                if (calculateTextWidth(part) <= blockWidth) {
                    currentPart = part;
                } else {
                    // Если даже отдельная часть не помещается, разбиваем по символам
                    return splitWordByCharacters(word);
                }
            }
        }

        if (currentPart) {
            result.push(currentPart);
        }

        return result;
    }

    // Аппроксимированные ширины
    const cyrillicWidths = {
        'а': 0.45, 'б': 0.45, 'в': 0.45, 'г': 0.35, 'д': 0.45, 'е': 0.45, 'ё': 0.45,
        'ж': 0.65, 'з': 0.45, 'и': 0.45, 'й': 0.45, 'к': 0.45, 'л': 0.45, 'м': 0.65,
        'н': 0.45, 'о': 0.45, 'п': 0.45, 'р': 0.45, 'с': 0.45, 'т': 0.45, 'у': 0.45,
        'ф': 0.65, 'х': 0.45, 'ц': 0.45, 'ч': 0.45, 'ш': 0.65, 'щ': 0.65, 'ъ': 0.45,
        'ы': 0.65, 'ь': 0.45, 'э': 0.45, 'ю': 0.65, 'я': 0.45,
        'А': 0.6, 'Б': 0.6, 'В': 0.6, 'Г': 0.5, 'Д': 0.65, 'Е': 0.6, 'Ё': 0.6,
        'Ж': 0.8, 'З': 0.6, 'И': 0.65, 'Й': 0.65, 'К': 0.6, 'Л': 0.65, 'М': 0.8,
        'Н': 0.65, 'О': 0.65, 'П': 0.65, 'Р': 0.6, 'С': 0.6, 'Т': 0.6, 'У': 0.6,
        'Ф': 0.8, 'Х': 0.6, 'Ц': 0.65, 'Ч': 0.6, 'Ш': 0.8, 'Щ': 0.85, 'Ъ': 0.65,
        'Ы': 0.75, 'Ь': 0.6, 'Э': 0.6, 'Ю': 0.85, 'Я': 0.6,
        '-': 0.3, // дефис для переносов
    };

    function getCharWidth(char) {
        // Проверяем кириллические символы
        if (cyrillicWidths[char]) {
            let width = cyrillicWidths[char];
            if (isBold) width *= 1.2;
            if (isItalic) width *= 1.1;
            return width;
        }

        // Латинские символы и другие
        const latinWidths = {
            'a': 0.5, 'b': 0.55, 'c': 0.45, 'd': 0.55, 'e': 0.5, 'f': 0.3,
            'g': 0.55, 'h': 0.55, 'i': 0.25, 'j': 0.25, 'k': 0.5, 'l': 0.25,
            'm': 0.85, 'n': 0.55, 'o': 0.55, 'p': 0.55, 'q': 0.55, 'r': 0.35,
            's': 0.45, 't': 0.3, 'u': 0.55, 'v': 0.5, 'w': 0.75, 'x': 0.5,
            'y': 0.5, 'z': 0.45,
            'A': 0.65, 'B': 0.65, 'C': 0.7, 'D': 0.7, 'E': 0.6, 'F': 0.55,
            'G': 0.75, 'H': 0.7, 'I': 0.25, 'J': 0.5, 'K': 0.65, 'L': 0.55,
            'M': 0.85, 'N': 0.7, 'O': 0.75, 'P': 0.6, 'Q': 0.75, 'R': 0.65,
            'S': 0.6, 'T': 0.6, 'U': 0.7, 'V': 0.65, 'W': 0.95, 'X': 0.65,
            'Y': 0.65, 'Z': 0.6,
            '0': 0.55, '1': 0.35, '2': 0.55, '3': 0.55, '4': 0.55, '5': 0.55,
            '6': 0.55, '7': 0.55, '8': 0.55, '9': 0.55,
            '.': 0.25, ',': 0.25, '!': 0.25, '?': 0.45, ':': 0.25, ';': 0.25,
            '_': 0.45, '(': 0.3, ')': 0.3, '[': 0.3, ']': 0.3,
            '{': 0.3, '}': 0.3, '<': 0.45, '>': 0.45, '=': 0.45, '+': 0.45,
            '*': 0.35, '/': 0.25, '\\': 0.25, '|': 0.15, '@': 0.8, '#': 0.55,
            '$': 0.55, '%': 0.85, '^': 0.45, '&': 0.65, '~': 0.45, '`': 0.25,
            '"': 0.35, "'": 0.15, ' ': 0.25
        };

        let width = latinWidths[char] || 0.5;
        if (isBold) width *= 1.2;
        if (isItalic) width *= 1.1;
        return width;
    }

    function calculateTextWidth(text) {
        if (!text || typeof text !== 'string') return 0; // Защита от undefined или не строки
        let totalWidth = 0;
        for (let i = 0; i < text.length; i++) {
            totalWidth += getCharWidth(text[i]) * fontSize;
        }
        return totalWidth;
    }

    function splitTextIntoLines(text) {
        if (!text) text = ''; // Защита от undefined
        // Сначала разбиваем по символам новой строки
        const textParts = text.split('\n');
        const allLines = [];
        
        for (let partIndex = 0; partIndex < textParts.length; partIndex++) {
            const part = textParts[partIndex];
            
            // Для каждой части, разделяем по пробелам
            const words = part.split(/\s+/).filter(word => word && word.length > 0); // Защита от undefined и пустых слов
            const lines = [];
            let currentLine = '';

            // Внутренняя функция для разбивки слова по символам
            function splitWordByCharacters(word, targetLines) {
                let currentPart = '';

                for (let j = 0; j < word.length; j++) {
                    const testPart = currentPart + word[j];
                    if (calculateTextWidth(testPart) <= blockWidth) {
                        currentPart = testPart;
                    } else {
                        if (currentPart) targetLines.push(currentPart);
                        currentPart = word[j];
                    }
                }

                if (currentPart) targetLines.push(currentPart);
            }

            for (let i = 0; i < words.length; i++) {
                const word = words[i];

                // Пробуем добавить целое слово
                const testLineFull = currentLine ? `${currentLine} ${word}` : word;

                if (calculateTextWidth(testLineFull) <= blockWidth) {
                    currentLine = testLineFull;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = '';
                    }

                    // Пробуем поместить слово в новую строку
                    if (calculateTextWidth(word) <= blockWidth) {
                        currentLine = word;
                    } else {
                        // Пробуем оптимальные переносы
                        const optimalParts = getOptimalHyphenatedParts(word, blockWidth);

                        if (optimalParts.length === 1) {
                            // Если слово не может быть разбито, добавляем его как есть
                            currentLine = optimalParts[0];
                        } else {
                            // Добавляем оптимальные части слова
                            for (let j = 0; j < optimalParts.length; j++) {
                                // Для всех частей, кроме последней, добавляем дефис, если часть переходит на следующую строку
                                const isLastPart = (j === optimalParts.length - 1);
                                const part = optimalParts[j];
                                const partWithHyphen = !isLastPart ? part + '-' : part;
                                const partWidth = calculateTextWidth(partWithHyphen);

                                if (partWidth <= blockWidth) {
                                    // Эта часть помещается
                                    if (!isLastPart) {
                                        // Промежуточная часть - добавляем в строки с дефисом
                                        lines.push(partWithHyphen);
                                    } else {
                                        // Последняя часть - добавляем в текущую строку
                                        currentLine = part;
                                    }
                                } else {
                                    // Даже часть с дефисом не помещается, разбиваем по символам
                                    splitWordByCharacters(word, lines);
                                    currentLine = '';
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Добавляем последнюю строку, если она не пуста
            if (currentLine) {
                lines.push(currentLine);
            }
            
            // Добавляем все строки из этой части в общий массив
            allLines.push(...lines);
            
            // Если это не последняя часть, добавляем пустую строку для обозначения разрыва
            if (partIndex < textParts.length - 1) {
                allLines.push('');
            }
        }

        // После формирования строк, проверяем, можно ли улучшить выравнивание
        return improveTextAlignment(allLines, blockWidth, fontSize, font, useHyphenation);
    }

    function centerLines(lines) {
        if (!isCentered && !isRighted) return lines;

        return lines.map(line => {
            const width = calculateTextWidth(line);
            if (width >= blockWidth) return line;
            const spaceWidth = getCharWidth(' ') * fontSize;
            var spaces = "";
            if (isCentered) spaces = Math.floor((blockWidth - width) / (2 * spaceWidth));
            else if (isRighted) spaces = Math.floor((blockWidth - width) / (spaceWidth));
            return ' '.repeat(Math.max(0, spaces)) + line;
        });
    }

    // Функция для улучшения выравнивания текста (резервная)
    function improveTextAlignment(lines, blockWidth, fontSize, font, useHyphenation) {
        // Отключаем улучшение выравнивания, если используются переносы
        if (useHyphenation || lines.length < 2) {
            // Если строк меньше 2 или используются переносы, нечего улучшать
            return lines;
        }

        const improvedLines = [...lines];
        const twoThirdsWidth = blockWidth * 2 / 3;
        
        // Пропускаем улучшение, если используем переносы
        if (useHyphenation) {
            return lines;
        }

        for (let i = 0; i < improvedLines.length - 1; i++) {
            const currentLine = improvedLines[i];
            // Убираем пробелы в начале для проверки длины
            const currentLineWithoutLeadingSpaces = currentLine.trimStart();
            const currentLineWidth = calculateTextWidth(currentLineWithoutLeadingSpaces, fontSize, font);

            // Проверяем, если строка без пробелов в начале занимает менее 2/3 ширины блока
            if (currentLineWidth < twoThirdsWidth) {
                // Проверяем следующую строку наличие слова, которое можно "забрать" часть
                const nextLine = improvedLines[i + 1];

                if (nextLine && nextLine.length > 0) {
                    // Проверяем, начинается ли следующая строка со слова, которое можно частично перенести
                    const wordsInNextLine = nextLine.split(/\s+/);
                    if (wordsInNextLine.length > 0) {
                        const firstWord = wordsInNextLine[0];

                        // Проверяем, является ли первое слово достаточно длинным для переноса
                        if (firstWord.length >= 5 && useHyphenation) {
                            // Используем алгоритм переносов для получения частей слова
                            const hyphenated = hyphenate(firstWord);
                            const allParts = hyphenated.split('\u00AD');

                            if (allParts.length > 1) {
                                // Пробуем добавить первую часть следующего слова к текущей строке
                                const firstPart = allParts[0];
                                const remainingPart = allParts.slice(1).join('');

                                // Проверяем, помещается ли первая часть в текущую строку
                                const testLine = currentLine ? `${currentLine} ${firstPart}` : firstPart;
                                const testLineWidth = calculateTextWidth(testLine, fontSize, font);

                                if (testLineWidth <= blockWidth) {
                                    // Можем добавить часть слова к текущей строке
                                    improvedLines[i] = testLine;

                                    // Обновляем следующую строку, заменив первое слово оставшейся частью
                                    const remainingWords = [remainingPart, ...wordsInNextLine.slice(1)].filter(part => part !== '');
                                    improvedLines[i + 1] = remainingWords.join(' ');
                                }
                            }
                        }
                    }
                }
            }
        }

        return improvedLines;
    }

    // Вызываем функцию разбивки текста на строки
    let lines = splitTextIntoLines(text);
    lines = improveTextAlignment(lines);
    lines = centerLines(lines);
    const lineHeight = fontSize * 1.2;

    return {
        lines: lines,
        lineHeight: lineHeight,
        fontSize: fontSize,
        blockWidth: blockWidth,
        useHyphenation: useHyphenation,
        fontMetrics: null
    };
}

// Экспорт функции
module.exports = { calculateTextLayout };

// Пример использования
async function example() {
    const result = await calculateTextLayout(
        "Пример длинного текста для тестирования\nразбиения по строкам\nс переносами слов", // текст с символами новой строки
        12,      // размер шрифта
        200,     // ширина блока
        false,   // не жирный
        false,   // не курсив
        false,   // не центрировать
        'Arial', // шрифт
        true     // использовать переносы
    );
    
    console.log('Результат разбивки текста:');
    console.log('Строки:', result.lines);
    console.log('Высота строки:', result.lineHeight);
}

// Запуск примера
if (require.main === module) {
    example().catch(console.error);
}
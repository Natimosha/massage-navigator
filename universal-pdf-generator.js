/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL PDF GENERATOR
 * 
 * Используется на странице "Спасибо" после оплаты.
 * Читает state из localStorage, генерирует персонализированный PDF.
 * 
 * Структура PDF:
 * 1. Титульная страница
 * 2. Ваша ситуация
 * 3. Ваш потенциал (превью шагов)
 * 4. Детализация каждого шага (по 2-4 страницы)
 * 5. Финальная страница (CTA)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТЫ И СПРАВОЧНИКИ
// ═══════════════════════════════════════════════════════════════════════════

const benchmarks = {
    moscow: { avgPrice: 4000 },
    spb: { avgPrice: 3500 },
    million: { avgPrice: 3000 },
    big: { avgPrice: 2500 },
    medium: { avgPrice: 2000 },
    small: { avgPrice: 1500 }
};

const placeExpenseRates = {
    'home': 0.15,
    'rent-room': 0.30,
    'rent-studio': 0.40,
    'own': 0.20,
    'mobile': 0.10
};

const cityNames = {
    moscow: 'Москва',
    spb: 'Санкт-Петербург',
    million: 'город-миллионник',
    big: 'крупный город',
    medium: 'средний город',
    small: 'небольшой город'
};

const workPlaceNames = {
    home: 'дома',
    'rent-room': 'арендованный кабинет',
    'rent-studio': 'своя студия',
    own: 'собственное помещение',
    mobile: 'с выездом к клиентам'
};

const fmt = n => Math.round(n).toLocaleString('ru-RU');

// ═══════════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ РАСЧЁТА ДОХОДА
// ═══════════════════════════════════════════════════════════════════════════

function getMonthlyProfit(state) {
    const weeks = 4;
    const expenseRate = placeExpenseRates[state.workPlace] || 0.15;
    
    if (state.workMode === 'salon-only') {
        return Math.round(state.salonPrice * state.salonClients * weeks * (state.salonPercent / 100));
    } else if (state.workMode === 'hybrid') {
        const salonProfit = Math.round(state.salonPrice * state.salonClients * weeks * (state.salonPercent / 100));
        const privateProfit = Math.round(state.privatePrice * state.privateClients * weeks * (1 - expenseRate));
        return salonProfit + privateProfit;
    } else {
        return Math.round(state.privatePrice * state.privateClients * weeks * (1 - expenseRate));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОПРЕДЕЛЕНИЕ СЦЕНАРИЯ
// ═══════════════════════════════════════════════════════════════════════════

function getScenario(state) {
    if (state.workMode === 'salon-only') {
        return state.energyVector === 'exit' ? 'salon-exit' : 'salon-grow';
    } else if (state.workMode === 'hybrid') {
        return state.energyVector === 'exit' ? 'hybrid-exit' : 'hybrid-grow';
    } else {
        const benchmark = benchmarks[state.city] || benchmarks.medium;
        const highPrice = state.privatePrice >= benchmark.avgPrice * 0.9;
        const goodRetention = state.repeatRate >= 45;
        return (highPrice && goodRetention) ? 'private-optimize' : 'private-grow';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОДГОТОВКА ДАННЫХ ДЛЯ ШАБЛОНОВ
// ═══════════════════════════════════════════════════════════════════════════

function prepareData(state) {
    const benchmark = benchmarks[state.city] || benchmarks.medium;
    const expenseRate = placeExpenseRates[state.workPlace] || 0.15;
    
    const data = {
        // Базовые
        userName: state.name || 'Уважаемый клиент',
        date: new Date().toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }),
        workMode: state.workMode,
        scenario: getScenario(state),
        
        // Город и место
        city: state.city,
        cityName: cityNames[state.city] || 'город',
        marketPrice: benchmark.avgPrice,
        workPlace: state.workPlace,
        workPlaceName: workPlaceNames[state.workPlace] || 'на дому',
        expenseRate: expenseRate,
        
        // Салон
        salonPrice: state.salonPrice || 0,
        salonClients: state.salonClients || 0,
        salonPercent: state.salonPercent || 0,
        salonClientSource: state.salonClientSource,
        salonPercentFair: state.salonPercentFair,
        
        // Частная практика
        privatePrice: state.privatePrice || 0,
        privateClients: state.privateClients || 0,
        
        // Показатели
        repeatRate: state.repeatRate || 0,
        sources: state.sources || [],
        sourcesCount: state.sources ? state.sources.length : 0,
        hasCRM: state.hasCRM || false,
        scalingInterest: state.scalingInterest,
        
        // Опыт
        experience: state.experience || 'более 3 лет'
    };
    
    // Расчёт доходов
    if (state.workMode === 'salon-only') {
        const profit = Math.round(state.salonPrice * state.salonClients * 4 * (state.salonPercent / 100));
        data.monthlyProfit = profit;
        data.monthlyProfitFmt = fmt(profit);
    } else if (state.workMode === 'hybrid') {
        const salonProfit = Math.round(state.salonPrice * state.salonClients * 4 * (state.salonPercent / 100));
        const privateProfit = Math.round(state.privatePrice * state.privateClients * 4 * (1 - expenseRate));
        data.salonProfit = salonProfit;
        data.privateProfit = privateProfit;
        data.monthlyProfit = salonProfit + privateProfit;
        data.salonProfitFmt = fmt(salonProfit);
        data.privateProfitFmt = fmt(privateProfit);
        data.monthlyProfitFmt = fmt(salonProfit + privateProfit);
        
        // Доход на клиента
        data.perClientSalon = Math.round(state.salonPrice * (state.salonPercent / 100));
        data.perClientPrivate = Math.round(state.privatePrice * (1 - expenseRate));
    } else {
        const profit = Math.round(state.privatePrice * state.privateClients * 4 * (1 - expenseRate));
        data.monthlyProfit = profit;
        data.monthlyProfitFmt = fmt(profit);
        data.perClientPrivate = Math.round(state.privatePrice * (1 - expenseRate));
    }
    
    return data;
}
// ═══════════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ ОПРЕДЕЛЕНИЯ ПЕРСОНАЛЬНЫХ ШАГОВ
// ═══════════════════════════════════════════════════════════════════════════

function getPersonalizedSteps(state) {
    const steps = [];
    const monthlyProfit = getMonthlyProfit(state);
    const benchmark = benchmarks[state.city] || benchmarks.medium;
    const expenseRate = placeExpenseRates[state.workPlace] || 0.15;
    
    // ═══════════════════════════════════════════════════════════════════
    // СЦЕНАРИЙ 1: SALON-ONLY + EXIT
    // ═══════════════════════════════════════════════════════════════════
    if (state.workMode === 'salon-only' && state.energyVector === 'exit') {
        
        const targetClients = Math.ceil(monthlyProfit / (state.salonPrice * 0.85 * 4));
        const potentialGain = Math.round(state.salonPrice * state.salonClients * 4 * (1 - state.salonPercent/100) * 0.85);
        
        steps.push({
            id: 'salon-exit-where',
            title: 'Определить, где будете принимать',
            detail: 'Три варианта: дома, аренда кабинета, выезд к клиентам. Начать можно с выезда — минимум вложений.',
            metric: 'Экономия на старте: от 0 до 15 000 р./мес',
            pdfBlocks: ['place-comparison', 'place-checklist', 'legal-ip-ausn']
        });
        
        steps.push({
            id: 'salon-exit-channels',
            title: 'Запустить 5 каналов привлечения',
            detail: 'Авито + Яндекс.Карты + ВК/Telegram + партнёрства + сарафан — комплексный подход.',
            metric: 'Ожидаемый поток: 10-20 заявок в месяц со всех каналов',
            pdfBlocks: ['channel-avito', 'channel-yandex-maps', 'channel-social', 'channel-partnerships', 'channel-word-of-mouth']
        });
        
        steps.push({
            id: 'salon-exit-scripts',
            title: 'Освоить скрипты продаж',
            detail: 'Как отвечать на заявки, закрывать на запись, отрабатывать возражения.',
            metric: 'Конверсия заявка → запись: 40-60%',
            pdfBlocks: ['scripts-first-clients']
        });
        
        steps.push({
            id: 'salon-exit-target-clients',
            title: 'Набрать ' + targetClients + ' своих клиентов в неделю',
            detail: 'Это минимум, чтобы выйти на текущий доход ' + fmt(monthlyProfit) + ' р.',
            metric: 'Потенциал при уходе: +' + fmt(potentialGain) + ' р./мес',
            data: { targetClients, monthlyProfit, potentialGain },
            pdfBlocks: ['exit-calculator', 'exit-timeline']
        });
        
        steps.push({
            id: 'salon-exit-reviews',
            title: 'Собрать 10+ отзывов до ухода',
            detail: 'Отзывы — ваш актив. Просите каждого клиента.',
            metric: 'Каждый отзыв = 1-2 новых клиента',
            pdfBlocks: ['reviews-how-to-ask', 'reviews-templates']
        });
        
        steps.push({
            id: 'salon-exit-ready-checklist',
            title: 'Проверить готовность к уходу',
            detail: 'Чек-лист из 12 пунктов: финансы, база, место, каналы.',
            metric: 'Минимум 10 из 12 = можно уходить',
            pdfBlocks: ['exit-checklist-12']
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // СЦЕНАРИЙ 2: SALON-ONLY + GROW
    // ═══════════════════════════════════════════════════════════════════
    else if (state.workMode === 'salon-only' && state.energyVector !== 'exit') {
        
        if (state.salonClientSource === 'admin-equal' || state.salonClientSource === 'take-leftovers') {
            steps.push({
                id: 'salon-grow-create-loyal',
                title: 'Создать "своих" клиентов',
                detail: 'Чтобы люди просили записать именно к вам.',
                metric: 'Цель: 30-40% клиентов просят именно вас',
                pdfBlocks: ['loyal-clients-7-techniques', 'loyal-clients-templates']
            });
        }
        
        if (state.salonClientSource === 'clients-ask' && state.salonPercentFair === 'low') {
            const targetPercent = Math.min(state.salonPercent + 10, 60);
            const gainFromPercent = Math.round(state.salonPrice * state.salonClients * 4 * 0.10);
            
            steps.push({
                id: 'salon-grow-negotiate-now',
                title: 'Договориться о повышении %',
                detail: 'Клиенты идут к вам — это ваш главный аргумент. Сейчас ' + state.salonPercent + '%, просите ' + targetPercent + '%.',
                metric: '+10% = +' + fmt(gainFromPercent) + ' р./мес',
                data: { currentPercent: state.salonPercent, targetPercent, gainFromPercent },
                pdfBlocks: ['negotiate-script', 'negotiate-arguments', 'negotiate-timing']
            });
        }
        else if (state.salonPercent < 50) {
            const gainFromPercent = Math.round(state.salonPrice * state.salonClients * 4 * 0.05);
            
            steps.push({
                id: 'salon-grow-prepare-negotiate',
                title: 'Подготовить аргументы для повышения %',
                detail: 'Сейчас ' + state.salonPercent + '%. Собирайте статистику и отзывы.',
                metric: '+5% = +' + fmt(gainFromPercent) + ' р./мес',
                pdfBlocks: ['negotiate-prepare', 'track-loyal-clients']
            });
        }
        
        if (state.repeatRate < 40) {
            steps.push({
                id: 'salon-grow-retention',
                title: 'Увеличить возвращаемость клиентов',
                detail: 'Сейчас ' + state.repeatRate + '% возвращаются. Норма 40-50%.',
                metric: '+15% возвращаемости = больше постоянных клиентов',
                pdfBlocks: ['retention-7-techniques', 'retention-templates']
            });
        }
        
        steps.push({
            id: 'salon-grow-own-base',
            title: 'Начать собирать свою базу',
            detail: 'Записывайте контакты тех, кто приходит к вам. Это страховка и актив.',
            metric: 'Минимум: имя + телефон + что беспокоило',
            pdfBlocks: ['client-base-template', 'client-base-how-to']
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // СЦЕНАРИЙ 3: HYBRID + EXIT
    // ═══════════════════════════════════════════════════════════════════
    else if (state.workMode === 'hybrid' && state.energyVector === 'exit') {
        
        const perClientPrivate = Math.round(state.privatePrice * (1 - expenseRate));
        const perClientSalon = Math.round(state.salonPrice * (state.salonPercent / 100));
        const targetClients = Math.ceil(monthlyProfit / (perClientPrivate * 4));
        
        if (state.privatePrice < benchmark.avgPrice * 0.85) {
            const priceDiff = benchmark.avgPrice - state.privatePrice;
            const gainFromPrice = Math.round(priceDiff * state.privateClients * 4 * 0.85);
            
            steps.push({
                id: 'hybrid-exit-raise-price',
                title: 'Поднять чек на частных клиентов',
                detail: 'Ваш чек ' + fmt(state.privatePrice) + ' р., рынок — ' + fmt(benchmark.avgPrice) + ' р.',
                metric: '+' + fmt(priceDiff) + ' р. к чеку = +' + fmt(gainFromPrice) + ' р./мес',
                pdfBlocks: ['raise-price-strategy', 'raise-price-scripts']
            });
        }
        
        steps.push({
            id: 'hybrid-exit-target-clients',
            title: 'Довести частную практику до ' + targetClients + ' клиентов/нед',
            detail: 'Сейчас ' + state.privateClients + '. Это точка, когда можно уходить.',
            metric: 'Каждый частный = ' + fmt(perClientPrivate) + ' р. (vs ' + fmt(perClientSalon) + ' р. в салоне)',
            pdfBlocks: ['hybrid-exit-calculator', 'hybrid-exit-timeline']
        });
        
        steps.push({
            id: 'hybrid-exit-channels',
            title: 'Усилить каналы привлечения',
            detail: 'Авито, Яндекс.Карты, соцсети, партнёрства, сарафан — полный комплект.',
            metric: 'Цель: 5 каналов, 10-20 заявок/мес',
            pdfBlocks: ['channel-avito', 'channel-yandex-maps', 'channel-social', 'channel-partnerships', 'channel-word-of-mouth']
        });
        
        steps.push({
            id: 'hybrid-exit-scripts',
            title: 'Освоить скрипты продаж',
            detail: 'Как отвечать на заявки, закрывать на запись, готовый прайс.',
            metric: 'Конверсия заявка → запись: 40-60%',
            pdfBlocks: ['scripts-first-clients']
        });
        
        if (state.repeatRate < 40) {
            const retentionGain = Math.round(state.privateClients * 4 * 0.15 * perClientPrivate);
            steps.push({
                id: 'hybrid-exit-retention',
                title: 'Поднять возвращаемость частных клиентов',
                detail: 'Сейчас ' + state.repeatRate + '%. Норма 45-55%.',
                metric: '+15% возвращаемости = +' + fmt(retentionGain) + ' р./мес',
                pdfBlocks: ['retention-system', 'retention-templates']
            });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // СЦЕНАРИЙ 4: HYBRID + GROW
    // ═══════════════════════════════════════════════════════════════════
    else if (state.workMode === 'hybrid' && state.energyVector !== 'exit') {
        
        const perClientPrivate = Math.round(state.privatePrice * (1 - expenseRate));
        const perClientSalon = Math.round(state.salonPrice * (state.salonPercent / 100));
        const percentDiff = Math.round((perClientPrivate / perClientSalon - 1) * 100);
        
        if (state.privatePrice < benchmark.avgPrice * 0.85) {
            const priceDiff = benchmark.avgPrice - state.privatePrice;
            const gainFromPrice = Math.round(priceDiff * state.privateClients * 4 * 0.85);
            
            steps.push({
                id: 'hybrid-grow-raise-price',
                title: 'Поднять чек на частных клиентов',
                detail: 'Ваш чек ' + fmt(state.privatePrice) + ' р., рынок — ' + fmt(benchmark.avgPrice) + ' р.',
                metric: '+' + fmt(priceDiff) + ' р. = +' + fmt(gainFromPrice) + ' р./мес',
                pdfBlocks: ['raise-price-strategy', 'raise-price-scripts']
            });
        }
        
        const gainFrom3Clients = perClientPrivate * 3 * 4;
        steps.push({
            id: 'hybrid-grow-add-clients',
            title: 'Добавить 3-5 частных клиентов в неделю',
            detail: 'Частные выгоднее: ' + fmt(perClientPrivate) + ' р. vs ' + fmt(perClientSalon) + ' р. (+' + percentDiff + '%).',
            metric: '+3 клиента = +' + fmt(gainFrom3Clients) + ' р./мес',
            pdfBlocks: ['grow-private-strategy', 'grow-private-schedule']
        });
        
        steps.push({
            id: 'hybrid-grow-channels',
            title: 'Усилить каналы привлечения',
            detail: 'Авито, Яндекс.Карты, соцсети, партнёрства, сарафан — полный комплект.',
            metric: 'Цель: 5 каналов, 10-20 заявок/мес',
            pdfBlocks: ['channel-avito', 'channel-yandex-maps', 'channel-social', 'channel-partnerships', 'channel-word-of-mouth']
        });
        
        steps.push({
            id: 'hybrid-grow-scripts',
            title: 'Освоить скрипты продаж',
            detail: 'Как отвечать на заявки, закрывать на запись, готовый прайс.',
            metric: 'Конверсия заявка → запись: 40-60%',
            pdfBlocks: ['scripts-first-clients']
        });
        
        if (state.repeatRate < 40) {
            const retentionGain = Math.round(state.privateClients * 4 * 0.15 * perClientPrivate);
            steps.push({
                id: 'hybrid-grow-retention',
                title: 'Поднять возвращаемость частных клиентов',
                detail: 'Сейчас ' + state.repeatRate + '%. Норма 45-55%.',
                metric: '+15% = +' + fmt(retentionGain) + ' р./мес',
                pdfBlocks: ['retention-system', 'retention-templates']
            });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // СЦЕНАРИЙ 5-6: PRIVATE-ONLY
    // ═══════════════════════════════════════════════════════════════════
    else if (state.workMode === 'private-only') {
        
        const perClient = Math.round(state.privatePrice * (1 - expenseRate));
        
        // КРИТИЧЕСКИЙ БЛОК: ПЛАН НА 30 ДНЕЙ
        steps.push({
            id: 'private-plan-30-days',
            title: 'План на 30 дней по неделям',
            detail: 'Пошаговый план: настройка каналов → первые заявки → конверсия → автоматизация.',
            metric: 'Ожидаемый результат: +5-10 новых клиентов за месяц',
            pdfBlocks: ['plan-30-days']
        });
        
        // БЛОК: ЦЕНА
        if (state.privatePrice < benchmark.avgPrice * 0.85) {
            const priceDiff = benchmark.avgPrice - state.privatePrice;
            const gainFromPrice = Math.round(priceDiff * state.privateClients * 4 * 0.85);
            
            steps.push({
                id: 'private-raise-price-low',
                title: 'Поднять цену для новых клиентов',
                detail: 'Ваш чек ' + fmt(state.privatePrice) + ' р., рынок — ' + fmt(benchmark.avgPrice) + ' р.',
                metric: '+' + fmt(priceDiff) + ' р. = +' + fmt(gainFromPrice) + ' р./мес',
                pdfBlocks: ['raise-price-strategy', 'raise-price-scripts', 'raise-price-faq']
            });
        }
        else if (state.privatePrice >= benchmark.avgPrice * 0.85 && state.privatePrice < benchmark.avgPrice * 1.05) {
            const targetPrice = Math.round(benchmark.avgPrice * 1.15);
            const priceDiff = targetPrice - state.privatePrice;
            const gainFromPrice = Math.round(priceDiff * state.privateClients * 4 * 0.85);
            
            steps.push({
                id: 'private-raise-price-market',
                title: 'Поднять чек чуть выше рынка',
                detail: 'Ваш чек на уровне рынка. Можно +10-15% для новых.',
                metric: '+' + fmt(priceDiff) + ' р. = +' + fmt(gainFromPrice) + ' р./мес',
                pdfBlocks: ['raise-price-premium', 'raise-price-positioning']
            });
        }
        
        // БЛОК: ВОЗВРАЩАЕМОСТЬ
        if (state.repeatRate < 40) {
            const retentionGain = Math.round(state.privateClients * 4 * 0.15 * perClient);
            steps.push({
                id: 'private-retention-low',
                title: 'Внедрить систему возврата клиентов',
                detail: 'Сейчас ' + state.repeatRate + '%. Норма 45-55%.',
                metric: '+15% = +' + fmt(retentionGain) + ' р./мес',
                pdfBlocks: ['retention-system', 'retention-templates', 'retention-automation']
            });
        }
        else if (state.repeatRate < 55) {
            const retentionGain = Math.round(state.privateClients * 4 * 0.10 * perClient);
            steps.push({
                id: 'private-retention-medium',
                title: 'Довести возвращаемость до 55%+',
                detail: 'Сейчас ' + state.repeatRate + '% — неплохо, но топы держат 55-65%.',
                metric: '+10% = +' + fmt(retentionGain) + ' р./мес',
                pdfBlocks: ['retention-advanced', 'retention-loyalty']
            });
        }
        
        // БЛОК: ИСТОЧНИКИ
        if (state.sources && state.sources.length <= 2) {
            steps.push({
                id: 'private-add-sources',
                title: 'Добавить источники клиентов',
                detail: 'Сейчас ' + state.sources.length + '. Нужно минимум 4-5 каналов.',
                metric: '+1 канал = 3-6 новых клиентов/мес',
                pdfBlocks: ['channel-avito', 'channel-yandex-maps', 'channel-social', 'channel-partnerships', 'channel-word-of-mouth']
            });
        }
        
        // БЛОК: СКРИПТЫ ПРОДАЖ
        steps.push({
            id: 'private-scripts',
            title: 'Освоить скрипты продаж',
            detail: 'Как отвечать на заявки, закрывать на запись, работать с возражениями.',
            metric: 'Конверсия заявка → запись: 40-60%',
            pdfBlocks: ['scripts-first-clients']
        });
        
        // БЛОК: CRM
        if (!state.hasCRM) {
            steps.push({
                id: 'private-setup-crm',
                title: 'Настроить онлайн-запись',
                detail: 'Клиенты записываются сами. YCLIENTS, Dikidi — от 0 р./мес.',
                metric: 'Экономия: 30-60 мин/день на переписку',
                pdfBlocks: ['crm-comparison', 'crm-setup-guide']
            });
        }
        
        // БЛОК: МАСШТАБИРОВАНИЕ
        if (state.scalingInterest === 'teach') {
            steps.push({
                id: 'private-scaling-teach',
                title: 'Начать обучать других',
                detail: 'Мастер-классы, курсы, менторство, гайды.',
                metric: 'Потенциал: x2-3 к доходу без увеличения нагрузки',
                pdfBlocks: ['scaling-teach-formats', 'scaling-teach-pricing', 'scaling-teach-first-students']
            });
        }
        else if (state.scalingInterest === 'space') {
            const hasOwnSpace = state.workPlace === 'rent-studio' || state.workPlace === 'own';
            
            if (hasOwnSpace) {
                steps.push({
                    id: 'private-scaling-expand',
                    title: 'Масштабировать через команду',
                    detail: 'Найм помощника, субаренда, второй мастер.',
                    metric: 'Потенциал: x2-3 к доходу',
                    pdfBlocks: ['scaling-hire-assistant', 'scaling-subrent', 'scaling-team-economics']
                });
            } else {
                steps.push({
                    id: 'private-scaling-own-space',
                    title: 'Открыть своё пространство',
                    detail: 'Кабинет с субарендой, найм помощника, своя студия.',
                    metric: 'Потенциал: x2-3 к доходу',
                    pdfBlocks: ['scaling-own-space-economics', 'scaling-own-space-checklist', 'scaling-subrent']
                });
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ГАРАНТИЯ МИНИМУМА ШАГОВ
    // ═══════════════════════════════════════════════════════════════════
    
    if (steps.length < 3 && state.repeatRate < 50) {
        steps.push({
            id: 'universal-retention',
            title: 'Улучшить возвращаемость клиентов',
            detail: 'Сейчас ' + state.repeatRate + '%. Напоминания, забота между визитами.',
            metric: '+10% возвращаемости = +15-20% к доходу',
            pdfBlocks: ['retention-system', 'retention-templates']
        });
    }
    
    if (steps.length < 3) {
        steps.push({
            id: 'universal-reviews',
            title: 'Собрать свежие отзывы',
            detail: 'Просите каждого довольного клиента.',
            metric: 'Каждый отзыв = 1-2 новых клиента',
            pdfBlocks: ['reviews-how-to-ask', 'reviews-templates']
        });
    }
    
    return steps.slice(0, 5);
}
// ═══════════════════════════════════════════════════════════════════════════
// CSS СТИЛИ ДЛЯ PDF
// ═══════════════════════════════════════════════════════════════════════════

const PDF_STYLES = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    background: #0d0d14;
    color: #e8e8e8;
    font-size: 15px;
    line-height: 1.7;
}

.page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm 22mm 25mm 22mm;
    background: linear-gradient(180deg, #0d0d14 0%, #12121c 100%);
    page-break-after: always;
    position: relative;
    box-sizing: border-box;
    overflow: visible;
}

.page:last-child {
    page-break-after: auto;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #2a2a3e;
    margin-bottom: 24px;
}

.logo {
    font-family: Georgia, serif;
    font-size: 12px;
    color: #d4a574;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.page-num {
    font-size: 12px;
    color: #666;
}

.page-footer {
    position: absolute;
    bottom: 15mm;
    left: 22mm;
    right: 22mm;
    text-align: center;
    font-size: 11px;
    color: #555;
    border-top: 1px solid #1a1a2e;
    padding-top: 10px;
}

h1 {
    font-family: Georgia, serif;
    font-size: 36px;
    color: #ffffff;
    margin-bottom: 20px;
    line-height: 1.25;
    font-weight: 500;
}

h2 {
    font-family: Georgia, serif;
    font-size: 26px;
    color: #d4a574;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #2a2a3e;
    font-weight: 500;
    line-height: 1.3;
}

h3 {
    font-family: Georgia, serif;
    font-size: 20px;
    color: #ffffff;
    margin: 28px 0 16px;
    font-weight: 500;
}

h4 {
    font-size: 13px;
    color: #d4a574;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
    font-weight: 600;
}

p {
    margin-bottom: 16px;
    color: #cccccc;
}

.lead {
    font-size: 18px;
    color: #a0a0a0;
    margin-bottom: 24px;
    line-height: 1.6;
}

.title-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 297mm;
    text-align: center;
    padding: 0;
}

.title-tag {
    font-size: 13px;
    color: #d4a574;
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-bottom: 32px;
}

.title-main {
    font-size: 44px;
    margin-bottom: 24px;
    line-height: 1.2;
}

.title-sub {
    font-size: 20px;
    color: #a0a0a0;
    max-width: 480px;
    line-height: 1.5;
    margin-bottom: 48px;
}

.title-badge {
    display: inline-block;
    padding: 16px 32px;
    border: 2px solid #d4a574;
    border-radius: 30px;
    color: #d4a574;
    font-size: 16px;
}

.title-date {
    margin-top: 48px;
    color: #666;
    font-size: 13px;
}

.card {
    background: #1a1a2e;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
}

.card-gold { border-left: 4px solid #d4a574; }
.card-green { border-left: 4px solid #7ec8a3; }
.card-bordered { border: 1px solid #2a2a3e; }

.stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
}

.stat-box {
    flex: 1;
    background: linear-gradient(135deg, #2a2a4e 0%, #1a1a2e 100%);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    border: 1px solid #3a3a5e;
}

.stat-label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.stat-value {
    font-family: Georgia, serif;
    font-size: 28px;
    color: #d4a574;
}

.stat-note {
    font-size: 12px;
    color: #666;
    margin-top: 6px;
}

.result-box {
    background: linear-gradient(135deg, #d4a574 0%, #b8956c 100%);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin: 20px 0;
}

.result-label {
    font-size: 13px;
    color: #1a1a2e;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.result-value {
    font-family: Georgia, serif;
    font-size: 32px;
    color: #1a1a2e;
    font-weight: 600;
}

.result-box-green {
    background: linear-gradient(135deg, #7ec8a3 0%, #5a9e7a 100%);
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 14px;
}

.data-table th {
    background: #2a2a4e;
    color: #d4a574;
    padding: 14px 16px;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.data-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #2a2a3e;
    color: #cccccc;
}

.data-table tr:last-child td { border-bottom: none; }
.data-table .highlight { color: #7ec8a3; font-weight: 600; }

.step-card {
    background: #1a1a2e;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
    border-left: 4px solid #d4a574;
}

.step-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
}

.step-num {
    width: 32px;
    height: 32px;
    background: #d4a574;
    color: #1a1a2e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 15px;
    flex-shrink: 0;
}

.step-title {
    font-weight: 600;
    color: #ffffff;
    font-size: 17px;
}

.step-content {
    color: #a0a0a0;
    font-size: 15px;
    line-height: 1.7;
    margin-left: 48px;
}

.script-box {
    background: #12121c;
    border: 1px solid #2a2a3e;
    border-radius: 10px;
    padding: 20px 24px;
    margin: 20px 0;
}

.script-label {
    font-size: 12px;
    color: #d4a574;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
    font-weight: 600;
}

.script-text {
    font-style: italic;
    color: #e0e0e0;
    line-height: 1.8;
    font-size: 15px;
    white-space: pre-line;
}

.template-box {
    background: #1a1a2e;
    border: 2px dashed #3a3a5e;
    border-radius: 10px;
    padding: 20px 24px;
    margin: 20px 0;
}

.template-title {
    font-size: 13px;
    color: #d4a574;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
    font-weight: 600;
}

.template-content {
    color: #e0e0e0;
    line-height: 1.8;
    font-size: 15px;
    white-space: pre-line;
}

.tip-box {
    background: linear-gradient(135deg, rgba(126, 200, 163, 0.15) 0%, rgba(90, 158, 122, 0.1) 100%);
    border: 1px solid rgba(126, 200, 163, 0.3);
    border-radius: 10px;
    padding: 18px 24px;
    color: #a8d8c0;
    margin: 20px 0;
    font-size: 15px;
    line-height: 1.6;
}

.tip-box strong { color: #7ec8a3; }

.warning-box {
    background: linear-gradient(135deg, rgba(244, 165, 116, 0.15) 0%, rgba(200, 126, 126, 0.1) 100%);
    border: 1px solid rgba(244, 165, 116, 0.3);
    border-radius: 10px;
    padding: 18px 24px;
    color: #e8c0a8;
    margin: 20px 0;
    font-size: 15px;
    line-height: 1.6;
}

.warning-box strong { color: #f4a574; }

.checklist {
    list-style: none;
    margin: 16px 0;
}

.checklist li {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid #1a1a2e;
    font-size: 15px;
    color: #cccccc;
}

.checklist li:last-child { border-bottom: none; }

.check-box {
    width: 20px;
    height: 20px;
    border: 2px solid #d4a574;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
}

.simple-list {
    list-style: none;
    margin: 16px 0;
}

.simple-list li {
    padding: 10px 0 10px 24px;
    position: relative;
    color: #cccccc;
    font-size: 15px;
    line-height: 1.6;
}

.simple-list li::before {
    content: "—";
    position: absolute;
    left: 0;
    color: #d4a574;
}

.numbered-list {
    list-style: none;
    margin: 16px 0;
    counter-reset: item;
}

.numbered-list li {
    padding: 12px 0 12px 40px;
    position: relative;
    color: #cccccc;
    font-size: 15px;
    line-height: 1.6;
    counter-increment: item;
}

.numbered-list li::before {
    content: counter(item) ".";
    position: absolute;
    left: 0;
    color: #d4a574;
    font-weight: 600;
    width: 24px;
}

.compare-row {
    display: flex;
    gap: 20px;
    margin: 20px 0;
}

.compare-box {
    flex: 1;
    background: #1a1a2e;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
}

.compare-label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
}

.compare-value {
    font-family: Georgia, serif;
    font-size: 28px;
    margin-bottom: 8px;
}

.compare-sub {
    font-size: 13px;
    color: #666;
}

.week-block {
    background: #1a1a2e;
    border-radius: 12px;
    margin-bottom: 16px;
    overflow: hidden;
}

.week-title {
    background: #d4a574;
    color: #1a1a2e;
    padding: 14px 20px;
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.week-content {
    padding: 20px;
    color: #cccccc;
    font-size: 15px;
    line-height: 1.7;
}

.two-cols {
    display: flex;
    gap: 20px;
}

.two-cols > * { flex: 1; }

.divider {
    height: 1px;
    background: #2a2a3e;
    margin: 32px 0;
}

.cta-card {
    background: #1a1a2e;
    border: 2px solid #d4a574;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 20px;
    text-align: left;
}

.cta-tag {
    font-size: 11px;
    color: #888;
    letter-spacing: 1px;
    margin-bottom: 6px;
}

.cta-title {
    font-family: Georgia, serif;
    font-size: 18px;
    color: #d4a574;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.cta-subtitle {
    color: #a0a0a0;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 14px;
}

.cta-section-title {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 12px 0 8px;
}

.cta-features {
    list-style: none;
    margin: 0 0 14px 0;
    padding: 0;
}

.cta-features li {
    padding: 4px 0 4px 20px;
    position: relative;
    color: #cccccc;
    font-size: 13px;
    line-height: 1.5;
}

.cta-features li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: #d4a574;
}

.cta-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin: 10px 0;
}

.cta-check {
    font-size: 12px;
    color: #888;
}

.cta-check::before {
    content: "✓ ";
    color: #7ec8a3;
}

.cta-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #2a2a3e;
}

.cta-price-block {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.cta-price-old {
    font-size: 13px;
    color: #666;
    text-decoration: line-through;
}

.cta-price {
    font-size: 22px;
    color: #7ec8a3;
    font-weight: 600;
}

.cta-price-period {
    font-size: 12px;
    color: #888;
    margin-right: 8px;
}

.cta-link-btn {
    display: inline-block;
    padding: 10px 20px;
    background: transparent;
    border: 1px solid #d4a574;
    border-radius: 6px;
    color: #d4a574;
    font-size: 13px;
    text-decoration: none;
}

.cta-link-btn-green {
    border-color: #7ec8a3;
    color: #7ec8a3;
}

.cta-help-box {
    text-align: center;
    padding: 20px;
    background: #12121c;
    border: 1px solid #2a2a3e;
    border-radius: 12px;
    margin-top: 20px;
}

.cta-help-title {
    color: #888;
    font-size: 14px;
    margin-bottom: 8px;
}

.cta-help-email {
    color: #d4a574;
    font-size: 14px;
}

.cta-desc {
    color: #a0a0a0;
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 16px;
}

.cta-link {
    color: #d4a574;
    font-size: 14px;
}
`;
// ═══════════════════════════════════════════════════════════════════════════
// ФУНКЦИИ ГЕНЕРАЦИИ СТРАНИЦ
// ═══════════════════════════════════════════════════════════════════════════

function pageWrapper(pageNum, totalPages, content) {
    return `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        ${content}
        <div class="page-footer">massagestart.ru</div>
    </div>`;
}

function titlePage(data) {
    const scenarioTitles = {
        'salon-exit': 'План перехода на частную практику',
        'salon-grow': 'План роста дохода в салоне',
        'hybrid-exit': 'План перехода на частную практику',
        'hybrid-grow': 'План развития гибридной практики',
        'private-grow': 'План роста частной практики',
        'private-optimize': 'План оптимизации и масштабирования'
    };
    
    const scenarioSubs = {
        'salon-exit': 'Как уйти из салона без потери дохода и выстроить свою практику',
        'salon-grow': 'Как увеличить заработок в салоне: больше клиентов, выше процент',
        'hybrid-exit': 'Как довести частную практику до точки, когда можно уйти из салона',
        'hybrid-grow': 'Как развивать частную практику параллельно с работой в салоне',
        'private-grow': 'Как привлекать больше клиентов и увеличивать доход',
        'private-optimize': 'Как оптимизировать работающую практику и выйти на новый уровень'
    };
    
    return `
    <div class="page">
        <div class="title-page">
            <div class="title-tag">Навигатор роста</div>
            <h1 class="title-main">${scenarioTitles[data.scenario] || 'Персональный план'}</h1>
            <p class="title-sub">${scenarioSubs[data.scenario] || 'План действий на основе вашей диагностики'}</p>
            <div class="title-badge">Подготовлен для: <strong>${data.userName}</strong></div>
            <p class="title-date">massagestart.ru | ${data.date}</p>
        </div>
    </div>`;
}

function situationPage(data, pageNum, totalPages) {
    let content = '<h2>Ваша ситуация</h2>';
    
    if (data.workMode === 'salon-only') {
        content += `
        <p class="lead">Вы работаете в салоне. Вот ваши текущие показатели:</p>
        
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-label">Средний чек</div>
                <div class="stat-value">${fmt(data.salonPrice)} р.</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Клиентов в неделю</div>
                <div class="stat-value">${data.salonClients}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Ваш процент</div>
                <div class="stat-value">${data.salonPercent}%</div>
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ваш доход сейчас</div>
            <div class="result-value">${data.monthlyProfitFmt} р./мес</div>
        </div>
        
        <div class="card card-bordered">
            <h4>Дополнительные данные</h4>
            <table class="data-table">
                <tr><td>Город</td><td>${data.cityName}</td></tr>
                <tr><td>Возвращаемость клиентов</td><td>${data.repeatRate}%</td></tr>
                <tr><td>Средний чек по рынку</td><td>${fmt(data.marketPrice)} р.</td></tr>
            </table>
        </div>`;
    } 
    else if (data.workMode === 'hybrid') {
        content += `
        <p class="lead">Вы совмещаете работу в салоне с частной практикой:</p>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #d4a574;">
                <div class="compare-label">Салон</div>
                <div class="compare-value" style="color: #d4a574;">${data.salonProfitFmt} р.</div>
                <div class="compare-sub">в месяц</div>
            </div>
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">Частная практика</div>
                <div class="compare-value" style="color: #7ec8a3;">${data.privateProfitFmt} р.</div>
                <div class="compare-sub">в месяц</div>
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Общий доход</div>
            <div class="result-value">${data.monthlyProfitFmt} р./мес</div>
        </div>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>Салон</h4>
                <p>Чек: ${fmt(data.salonPrice)} р.</p>
                <p>Клиентов/нед: ${data.salonClients}</p>
                <p>Процент: ${data.salonPercent}%</p>
            </div>
            <div class="card card-green">
                <h4>Частная практика</h4>
                <p>Чек: ${fmt(data.privatePrice)} р.</p>
                <p>Клиентов/нед: ${data.privateClients}</p>
                <p>Место: ${data.workPlaceName}</p>
            </div>
        </div>`;
    }
    else {
        content += `
        <p class="lead">Вы ведёте частную практику. Вот ваши текущие показатели:</p>
        
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-label">Средний чек</div>
                <div class="stat-value">${fmt(data.privatePrice)} р.</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Клиентов в неделю</div>
                <div class="stat-value">${data.privateClients}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Возвращаемость</div>
                <div class="stat-value">${data.repeatRate}%</div>
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ваш доход сейчас</div>
            <div class="result-value">${data.monthlyProfitFmt} р./мес</div>
        </div>
        
        <div class="card card-bordered">
            <h4>Дополнительные данные</h4>
            <table class="data-table">
                <tr><td>Город</td><td>${data.cityName}</td></tr>
                <tr><td>Где принимаете</td><td>${data.workPlaceName}</td></tr>
                <tr><td>Средний чек по рынку</td><td>${fmt(data.marketPrice)} р.</td></tr>
                <tr><td>Источников клиентов</td><td>${data.sourcesCount}</td></tr>
            </table>
        </div>`;
    }
    
    return pageWrapper(pageNum, totalPages, content);
}

function potentialPage(data, steps, pageNum, totalPages) {
    let stepsPreview = steps.map((step, i) => `
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">${i + 1}</div>
                <div class="step-title">${step.title}</div>
            </div>
            <div class="step-content">${step.metric}</div>
        </div>
    `).join('');
    
    const content = `
        <h2>Ваш план действий</h2>
        
        <p class="lead">На основе ваших данных мы определили ${steps.length} ключевых направлений для роста. 
        Каждое из них детально разобрано на следующих страницах.</p>
        
        ${stepsPreview}
        
        <div class="tip-box">
            <strong>Важно:</strong> не пытайтесь сделать всё сразу. Начните с первого шага, 
            доведите его до результата, потом переходите к следующему.
        </div>
    `;
    
    return pageWrapper(pageNum, totalPages, content);
}

function stepIntroPage(step, stepIndex, data, pageNum, totalPages) {
    const content = `
        <h2>Шаг ${stepIndex + 1}: ${step.title}</h2>
        
        <p class="lead">${step.detail}</p>
        
        <div class="result-box result-box-green">
            <div class="result-label">Ожидаемый результат</div>
            <div class="result-value" style="font-size: 24px;">${step.metric}</div>
        </div>
        
        <p style="margin-top: 24px; color: #888;">
            На следующих страницах — подробная инструкция, шаблоны и скрипты для этого шага.
        </p>
    `;
    
    return pageWrapper(pageNum, totalPages, content);
}

function finalPage(data, pageNum, totalPages) {
    
    // СТРАНИЦА 1: Заголовок + Курс "7 дней"
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2 style="text-align: center; border: none;">Что дальше?</h2>
        
        <p class="lead" style="text-align: center; max-width: 520px; margin: 0 auto 20px; font-size: 16px;">
            Вы получили план — это 20% успеха. Остальные 80% — в реализации.
        </p>
        
        <p style="text-align: center; color: #888; font-size: 14px; margin-bottom: 24px;">
            Если хотите внедрить быстрее и без ошибок, есть два пути:
        </p>
        
        <!-- Курс 7 дней -->
        <div class="cta-card">
            <div class="cta-tag">📚</div>
            <div class="cta-title">Курс «7 дней — 7 шагов к доходу на массаже»</div>
            <p class="cta-subtitle">Для тех, кто готов внедрять самостоятельно, но хочет пошаговую систему.</p>
            
            <div class="cta-section-title">Что внутри:</div>
            <ul class="cta-features">
                <li>7 видео-модулей: от первого клиента до стабильных 80-200К</li>
                <li>20+ готовых шаблонов: скрипты, объявления, сообщения</li>
                <li>Чек-листы настройки всех каналов: Авито, Карты, соцсети</li>
                <li>Система удержания: как довести возвращаемость до 50%+</li>
            </ul>
            
            <div class="cta-section-title">Подойдёт, если:</div>
            <div class="cta-checks">
                <span class="cta-check">Готовы выделять 1-2 часа в день</span>
                <span class="cta-check">Хотите разобраться сами</span>
                <span class="cta-check">Бюджет ограничен</span>
            </div>
            
            <div class="cta-footer">
                <div class="cta-price-block">
                    <span class="cta-price-old">12 000 ₽</span>
                    <span class="cta-price">от 6 500 ₽</span>
                </div>
                <a href="https://lp.massagestart.ru" class="cta-link-btn">lp.massagestart.ru →</a>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    // СТРАНИЦА 2: Персональный навигатор + блок помощи
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <!-- Персональный навигатор -->
        <div class="cta-card" style="border-color: #7ec8a3; margin-top: 10px;">
            <div class="cta-tag">🎯</div>
            <div class="cta-title" style="color: #7ec8a3;">Персональный навигатор роста</div>
            <p class="cta-subtitle">Для тех, кто хочет быстрый результат с поддержкой эксперта.</p>
            
            <div class="cta-section-title">Что входит:</div>
            <ul class="cta-features">
                <li>Глубокий разбор вашей ситуации (1-1,5 часа)</li>
                <li>Персональная стратегия под ваш город и нишу</li>
                <li>Еженедельные созвоны — разбираем, что работает</li>
                <li>Поддержка в Telegram между созвонами</li>
                <li>Доведение до результата: работаем, пока не достигнете цели</li>
            </ul>
            
            <div class="cta-section-title">Подойдёт, если:</div>
            <div class="cta-checks">
                <span class="cta-check">Хотите результат за 1-3 месяца</span>
                <span class="cta-check">Нужна обратная связь</span>
                <span class="cta-check">Готовы инвестировать в скорость</span>
            </div>
            
            <div class="cta-footer">
                <div class="cta-price-block">
                    <span class="cta-price-period">1-3 месяца</span>
                    <span class="cta-price">39 900 ₽</span>
                </div>
                <a href="https://forms.gle/sq3ns2Co5CNjoP6h6" class="cta-link-btn cta-link-btn-green">Оставить заявку →</a>
            </div>
        </div>
        
        <!-- Блок помощи -->
        <div class="cta-help-box">
            <div class="cta-help-title">Не знаете, что выбрать?</div>
            <p style="color: #a0a0a0; font-size: 13px; margin: 0;">
                Напишите на <span class="cta-help-email">7days@massagestart.ru</span> — ответим, какой вариант лучше подойдёт именно для вашей ситуации.
            </p>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: channel-avito
 * 
 * Авито за 20 минут: пошаговая настройка
 * Используется в: salon-exit, hybrid-exit, hybrid-grow, private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_channel_avito(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Авито: первые клиенты за 3-7 дней</h2>
        
        <p class="lead">
            Авито — самый быстрый способ получить первых клиентов на частную практику. 
            Бесплатно, без сложных настроек, работает в любом городе России.
        </p>
        
        <h3>Почему Авито работает</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Плюсы</h4>
                <ul class="simple-list">
                    <li>Люди сами ищут массажиста</li>
                    <li>Бесплатное размещение</li>
                    <li>Первые заявки за 3-7 дней</li>
                    <li>Можно указать район</li>
                    <li>Встроенный мессенджер</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Особенности</h4>
                <ul class="simple-list">
                    <li>Много конкурентов</li>
                    <li>Клиенты сравнивают цены</li>
                    <li>Нужны хорошие фото</li>
                    <li>Важны отзывы на профиле</li>
                </ul>
            </div>
        </div>
        
        <h3>Пошаговая настройка</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Создайте профиль или войдите</div>
            </div>
            <div class="step-content">
                Зайдите на avito.ru, войдите через номер телефона. Заполните имя, добавьте фото профиля — 
                это повышает доверие. Укажите реальное имя, не псевдоним.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Выберите категорию</div>
            </div>
            <div class="step-content">
                Услуги — Красота и здоровье — Массаж. Это важно: в правильной категории 
                вас найдут те, кто ищет именно массаж.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Напишите заголовок</div>
            </div>
            <div class="step-content">
                Заголовок должен содержать ключевые слова, по которым ищут. 
                Не «Массаж», а «Массаж спины и шеи / Выезд / ${data.cityName || 'Ваш район'}».
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Важно:</strong> Авито показывает объявления по релевантности. 
            Чем точнее заголовок соответствует запросу — тем выше вы в выдаче.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Что писать в описании</h3>
        
        <div class="template-box">
            <div class="template-title">Шаблон объявления</div>
            <div class="template-content">Провожу сеансы классического и лечебного массажа.

Что делаю:
— массаж спины и шейно-воротниковой зоны
— общий массаж тела
— антицеллюлитный массаж
— массаж при болях в пояснице

Опыт работы — ${data.experience || 'более 3 лет'}. Работаю с медицинским образованием.

Принимаю ${data.workPlaceName || 'в оборудованном кабинете'}.
Район: ${data.district || 'уточняйте при записи'}.

Длительность сеанса: 60 минут.
Стоимость: ${data.privatePrice || '2500'} р.

Для записи напишите в сообщения — отвечаю в течение часа.</div>
        </div>
        
        <h3>Фотографии</h3>
        
        <div class="card card-bordered">
            <p>Добавьте 3-5 фотографий:</p>
            <ul class="numbered-list">
                <li>Ваше фото в рабочей одежде (вызывает доверие)</li>
                <li>Рабочее место: чистый кабинет, массажный стол</li>
                <li>Диплом или сертификат (можно частично)</li>
                <li>Фото процесса работы (со спины клиента, без лица)</li>
            </ul>
        </div>
        
        <div class="warning-box">
            <strong>Не используйте:</strong> стоковые фото из интернета, фото в купальниках, 
            фото низкого качества, тёмные или размытые снимки.
        </div>
        
        <h3>После публикации</h3>
        
        <div class="card card-gold">
            <h4>Первая неделя</h4>
            <ul class="simple-list">
                <li>Проверяйте сообщения каждые 2-3 часа</li>
                <li>Отвечайте быстро — это влияет на рейтинг</li>
                <li>Попросите первых клиентов оставить отзыв</li>
                <li>Обновляйте объявление раз в 3 дня (поднимает в выдаче)</li>
            </ul>
        </div>
        
        <h3>Как отвечать на заявки</h3>
        
        <div class="script-box">
            <div class="script-label">Скрипт ответа</div>
            <div class="script-text">«Добрый день! Да, принимаю. Работаю [дни недели], 
есть свободное время [варианты]. 

Вам удобнее утром или вечером? 
Подскажите, что беспокоит — подготовлюсь к сеансу.»</div>
        </div>
        
        <div class="tip-box">
            <strong>Ожидаемый результат:</strong> 3-8 заявок в месяц при правильном оформлении. 
            В крупных городах — больше, в небольших — меньше, но стабильно.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_channel_avito };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: channel-yandex-maps
 * 
 * Яндекс.Карты за 30 минут: регистрация и продвижение
 * Используется в: salon-exit, hybrid-exit, hybrid-grow, private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_channel_yandex_maps(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Яндекс.Карты: клиенты из поиска</h2>
        
        <p class="lead">
            Когда человек ищет «массаж рядом» или «массажист + район», он видит карточки 
            на Яндекс.Картах. Если вас там нет — вы теряете клиентов каждый день.
        </p>
        
        <h3>Почему это важно</h3>
        
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-label">Ищут массаж</div>
                <div class="stat-value">~50 000</div>
                <div class="stat-note">запросов в месяц по России</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Конверсия</div>
                <div class="stat-value">5-15%</div>
                <div class="stat-note">из просмотра в звонок</div>
            </div>
        </div>
        
        <h3>Пошаговая регистрация</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Зайдите в Яндекс.Бизнес</div>
            </div>
            <div class="step-content">
                Откройте business.yandex.ru и войдите через Яндекс-аккаунт. 
                Нажмите «Добавить организацию». Это бесплатно.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Заполните карточку</div>
            </div>
            <div class="step-content">
                Название: «Массажист [Ваше имя]» или «Массаж [Район]». 
                Категория: «Массажный салон» или «Массажист». 
                Адрес: укажите точный адрес, где принимаете.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Добавьте контакты</div>
            </div>
            <div class="step-content">
                Телефон (будет кнопка «Позвонить»), WhatsApp или Telegram для записи, 
                ссылка на соцсети если есть. Чем больше способов связи — тем лучше.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">Укажите услуги и цены</div>
            </div>
            <div class="step-content">
                Добавьте все виды массажа с ценами. Яндекс показывает цены в выдаче — 
                это помогает клиенту выбрать. Пример: «Массаж спины, 60 мин — ${data.privatePrice || '2500'} р.»
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Если принимаете дома:</strong> можно не указывать точный адрес. 
            Выберите «Выезд к клиенту» или укажите только район.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Как попасть в топ выдачи</h3>
        
        <p>Яндекс ранжирует карточки по нескольким факторам. Вот что вы можете контролировать:</p>
        
        <div class="card card-gold">
            <h4>Отзывы — главный фактор</h4>
            <p>Чем больше отзывов и выше рейтинг — тем выше позиция. 
            Просите каждого клиента оставить отзыв. Цель: 10+ отзывов за первые 2 месяца.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Заполненность профиля</h4>
            <ul class="simple-list">
                <li>Добавьте 5-10 фотографий (кабинет, вы за работой, сертификаты)</li>
                <li>Заполните описание: кто вы, какой опыт, что делаете</li>
                <li>Укажите график работы</li>
                <li>Добавьте все услуги с ценами</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Активность</h4>
            <ul class="simple-list">
                <li>Отвечайте на отзывы (даже на положительные)</li>
                <li>Обновляйте информацию при изменениях</li>
                <li>Добавляйте новые фото раз в месяц</li>
            </ul>
        </div>
        
        <h3>Как просить отзывы</h3>
        
        <div class="script-box">
            <div class="script-label">После сеанса</div>
            <div class="script-text">«Рада, что вам понравилось! Если не сложно, оставьте отзыв 
на Яндекс.Картах — это очень помогает в продвижении. 
Я сейчас скину ссылку в WhatsApp, там буквально минута.»</div>
        </div>
        
        <div class="tip-box">
            <strong>Лайфхак:</strong> сделайте QR-код со ссылкой на вашу карточку 
            и распечатайте его. Положите на видное место в кабинете или давайте клиенту 
            визитку с QR-кодом.
        </div>
        
        <h3>Что ещё добавить</h3>
        
        <div class="card card-green">
            <h4>2ГИС</h4>
            <p>Работает по тому же принципу. Зарегистрируйтесь на 2gis.ru — 
            это займёт ещё 20 минут, а охват увеличится. Особенно актуально 
            для городов, где 2ГИС популярнее Яндекса.</p>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат</div>
            <div class="result-value">2-5 заявок в месяц</div>
        </div>
        
        <p class="muted" style="text-align: center;">
            При 10+ отзывах и заполненном профиле. Растёт со временем.
        </p>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_channel_yandex_maps };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: channel-social
 * 
 * Соцсети: ВКонтакте и Telegram
 * Используется в: salon-exit, hybrid-exit, hybrid-grow, private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_channel_social(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Соцсети: ВКонтакте и Telegram</h2>
        
        <p class="lead">
            Соцсети — это долгосрочный канал. Первые клиенты придут не сразу, 
            но через 2-3 месяца регулярного ведения вы получите стабильный поток 
            заявок от людей, которые вам уже доверяют.
        </p>
        
        <h3>С чего начать</h3>
        
        <p>Не нужно вести все соцсети сразу. Выберите одну и сосредоточьтесь на ней:</p>
        
        <div class="two-cols">
            <div class="card card-bordered">
                <h4>ВКонтакте</h4>
                <ul class="simple-list">
                    <li>Больше аудитория 30+</li>
                    <li>Удобные сообщества</li>
                    <li>Можно запускать рекламу</li>
                    <li>Хорошо для регионов</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Telegram</h4>
                <ul class="simple-list">
                    <li>Растущая аудитория</li>
                    <li>Проще в ведении</li>
                    <li>Высокая вовлечённость</li>
                    <li>Лучше для Москвы и СПб</li>
                </ul>
            </div>
        </div>
        
        <h3>Оформление профиля</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Фото профиля</div>
            </div>
            <div class="step-content">
                Ваше лицо, улыбка, светлый фон. Не логотип, не руки, не цветочки. 
                Люди хотят видеть, к кому они придут на массаж.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Имя и описание</div>
            </div>
            <div class="step-content">
                Имя: «Анна | Массажист ${data.cityName || 'Москва'}». 
                В описании: что делаете, где принимаете, как записаться. 
                Добавьте ссылку на запись или номер телефона.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Закреплённый пост</div>
            </div>
            <div class="step-content">
                Создайте пост-знакомство: кто вы, какой опыт, что делаете, 
                сколько стоит, как записаться. Закрепите его — это первое, 
                что увидит новый подписчик.
            </div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Шаблон закреплённого поста</div>
            <div class="template-content">Привет! Меня зовут [Имя], я массажист.

Работаю ${data.experience || 'более 3 лет'}, специализируюсь на классическом 
и лечебном массаже. Помогаю справиться с болями в спине, 
снять напряжение, восстановиться после нагрузок.

Принимаю ${data.workPlaceName || 'в кабинете'} в [районе].
Сеанс 60 минут — ${data.privatePrice || '2500'} р.

📲 Для записи: пишите в ЛС или в Telegram @ваш_ник</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>О чём писать: контент-план</h3>
        
        <p>Не нужно выдумывать темы каждый день. Вот простая схема на неделю:</p>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>День</th>
                    <th>Тип контента</th>
                    <th>Пример</th>
                </tr>
                <tr>
                    <td>Пн</td>
                    <td>Польза</td>
                    <td>«Почему болит шея после сна»</td>
                </tr>
                <tr>
                    <td>Ср</td>
                    <td>Закулисье</td>
                    <td>«Как прошёл мой рабочий день»</td>
                </tr>
                <tr>
                    <td>Пт</td>
                    <td>Отзыв или кейс</td>
                    <td>«Клиентка пришла с болью в пояснице...»</td>
                </tr>
            </table>
        </div>
        
        <p>Три поста в неделю — достаточно для начала. Главное — регулярность.</p>
        
        <h3>Идеи для постов</h3>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>Что работает</h4>
                <ul class="simple-list">
                    <li>Ответы на частые вопросы</li>
                    <li>Развеивание мифов о массаже</li>
                    <li>Истории клиентов (без имён)</li>
                    <li>Советы по самопомощи</li>
                    <li>Ваш путь в профессии</li>
                    <li>Рабочие моменты</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Чего избегать</h4>
                <ul class="simple-list">
                    <li>Только «запись открыта»</li>
                    <li>Сложные медицинские термины</li>
                    <li>Негатив о клиентах</li>
                    <li>Политика и споры</li>
                    <li>Слишком личное</li>
                </ul>
            </div>
        </div>
        
        <h3>Как получать подписчиков</h3>
        
        <div class="numbered-list">
            <li>Попросите друзей и родственников подписаться и сделать репост</li>
            <li>Добавьте ссылку на канал в подпись Telegram и во все мессенджеры</li>
            <li>Разместите QR-код на визитке и в кабинете</li>
            <li>После сеанса: «Подпишитесь на мой канал, там полезные советы по здоровью спины»</li>
            <li>Комментируйте посты в местных городских сообществах</li>
            <li>Попросите довольных клиентов отметить вас в сторис</li>
        </div>
        
        <div class="tip-box">
            <strong>Реалистичные ожидания:</strong> первые 2-3 месяца соцсети дают мало клиентов. 
            Но потом начинают приходить люди, которые читали вас полгода и наконец решились. 
            Это самые лояльные клиенты.
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат через 3-6 месяцев</div>
            <div class="result-value">2-4 клиента в месяц</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_channel_social };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-system
 * 
 * Система возврата клиентов: полный цикл
 * Используется в: hybrid-exit, hybrid-grow, private-grow, private-optimize
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_system(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Система возврата клиентов</h2>
        
        <p class="lead">
            Привлечь нового клиента стоит в 5-7 раз дороже, чем вернуть существующего. 
            При этом постоянные клиенты приносят 80% дохода. Система возврата — 
            это не «впаривание», а забота, которая превращает разовых клиентов в постоянных.
        </p>
        
        <h3>Ваши текущие показатели</h3>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #f4a574;">
                <div class="compare-label">Сейчас</div>
                <div class="compare-value" style="color: #f4a574;">${data.repeatRate || 30}%</div>
                <div class="compare-sub">возвращаются</div>
            </div>
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">Цель</div>
                <div class="compare-value" style="color: #7ec8a3;">50-60%</div>
                <div class="compare-sub">норма для практики</div>
            </div>
        </div>
        
        <h3>Цикл работы с клиентом</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Во время сеанса</div>
            </div>
            <div class="step-content">
                Запоминайте детали: имя, что беспокоит, о чём говорили. 
                Объясняйте, что делаете. Давайте рекомендации на дом. 
                В конце спросите о самочувствии и предложите записаться.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Через 1-2 дня после сеанса</div>
            </div>
            <div class="step-content">
                Напишите короткое сообщение: как самочувствие? Это показывает заботу 
                и даёт возможность ответить на вопросы. Большинство массажистов 
                этого не делают — вы будете выделяться.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Через 2-3 недели</div>
            </div>
            <div class="step-content">
                Напоминание о записи. Не навязчивое «приходите», а вопрос: 
                как спина? Может, пора повторить? Предложите конкретное время.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">Если не ответили — через месяц</div>
            </div>
            <div class="step-content">
                Последнее касание. Если клиент не отвечает три раза — 
                оставьте его в покое. Возможно, он вернётся сам через полгода.
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Почему клиенты не возвращаются</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Причина</th>
                    <th>Решение</th>
                </tr>
                <tr>
                    <td>Забыли о вас</td>
                    <td>Напоминания через 2-3 недели</td>
                </tr>
                <tr>
                    <td>Не поняли ценность</td>
                    <td>Объяснять результат на сеансе</td>
                </tr>
                <tr>
                    <td>Неудобно записываться</td>
                    <td>Предлагать конкретное время</td>
                </tr>
                <tr>
                    <td>Нашли другого</td>
                    <td>Выделяться сервисом и заботой</td>
                </tr>
                <tr>
                    <td>Не было денег</td>
                    <td>Напомнить через месяц-два</td>
                </tr>
            </table>
        </div>
        
        <h3>Инструменты для системы</h3>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>Минимум (бесплатно)</h4>
                <ul class="simple-list">
                    <li>Google-таблица с клиентами</li>
                    <li>Напоминания в календаре</li>
                    <li>Шаблоны сообщений</li>
                </ul>
            </div>
            <div class="card card-green">
                <h4>Продвинутый вариант</h4>
                <ul class="simple-list">
                    <li>CRM: YCLIENTS, Dikidi</li>
                    <li>Автоматические напоминания</li>
                    <li>История визитов клиента</li>
                </ul>
            </div>
        </div>
        
        <h3>Частые ошибки</h3>
        
        <div class="warning-box">
            <ul class="simple-list">
                <li><strong>Писать каждую неделю</strong> — это раздражает. Раз в 2-3 недели достаточно.</li>
                <li><strong>Только «запишитесь»</strong> — начинайте с вопроса о самочувствии.</li>
                <li><strong>Шаблонные сообщения</strong> — добавляйте личное: имя, что обсуждали.</li>
                <li><strong>Не фиксировать отказы</strong> — если человек три раза не ответил, не пишите.</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Главный принцип:</strong> вы не продаёте, вы заботитесь. 
            Клиент сам решает, нужен ли ему массаж. Ваша задача — напомнить о себе 
            в нужный момент и сделать запись удобной.
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат</div>
            <div class="result-value">+15-20% к возвращаемости</div>
        </div>
        
        <p class="muted" style="text-align: center;">
            За 1-2 месяца при регулярном использовании системы
        </p>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_system };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-templates
 * 
 * Шаблоны сообщений для возврата клиентов
 * Используется в: salon-grow, hybrid-exit, hybrid-grow, private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_templates(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Шаблоны сообщений для возврата</h2>
        
        <p class="lead">
            Готовые тексты для WhatsApp и Telegram. Адаптируйте под себя, 
            добавляйте личные детали — это повышает отклик.
        </p>
        
        <h3>После сеанса (через 1-2 дня)</h3>
        
        <div class="template-box">
            <div class="template-title">Вариант 1: Простой</div>
            <div class="template-content">[Имя], здравствуйте!

Как ваше самочувствие после массажа? 
Если есть вопросы — пишите, отвечу.</div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Вариант 2: С напоминанием о рекомендациях</div>
            <div class="template-content">[Имя], добрый день!

Как спина сегодня? Напоминаю про упражнения, 
которые показывала — делайте хотя бы утром, 
это закрепит результат.

Если что-то беспокоит — напишите.</div>
        </div>
        
        <h3>Напоминание о записи (через 2-3 недели)</h3>
        
        <div class="template-box">
            <div class="template-title">Вариант 1: Вопрос о самочувствии</div>
            <div class="template-content">[Имя], привет!

Как поясница? Прошло уже [X] недель с нашего сеанса. 
Обычно к этому времени напряжение возвращается.

Может, запишемся на эту неделю? 
Есть [день] вечером и [день] днём.</div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Вариант 2: Мягкое напоминание</div>
            <div class="template-content">[Имя], здравствуйте!

Давно не виделись — как вы? 
Если нужен массаж, у меня есть окна на этой неделе.

Напишите, когда удобно — подберём время.</div>
        </div>
        
        <div class="tip-box">
            <strong>Важно:</strong> всегда предлагайте конкретные варианты времени. 
            «Запишитесь» работает хуже, чем «Есть четверг вечером или суббота утром».
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Возврат «потерянного» клиента (1-2 месяца без визита)</h3>
        
        <div class="template-box">
            <div class="template-title">Вариант 1: Лёгкий</div>
            <div class="template-content">[Имя], привет!

Давно вас не было — всё в порядке? 
Если нужен массаж, я по-прежнему принимаю [где].

Буду рада видеть!</div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Вариант 2: С поводом</div>
            <div class="template-content">[Имя], здравствуйте!

Вспомнила о вас — у меня появилось несколько 
свободных окон на следующей неделе, что редкость.

Если актуально — напишите, забронирую для вас время.</div>
        </div>
        
        <h3>Поздравления (день рождения, праздники)</h3>
        
        <div class="template-box">
            <div class="template-title">День рождения</div>
            <div class="template-content">[Имя], с днём рождения!

Желаю здоровья и лёгкости в теле.
Если захотите сделать себе подарок — 
приходите на массаж, буду рада.</div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Новый год / 8 марта</div>
            <div class="template-content">[Имя], с праздником!

Желаю отличного настроения и времени на себя.
После праздников жду на массаж — 
снять накопившееся напряжение.</div>
        </div>
        
        <h3>Правила хороших сообщений</h3>
        
        <div class="card card-bordered">
            <ul class="checklist">
                <li><span class="check-box"></span>Обращайтесь по имени</li>
                <li><span class="check-box"></span>Начинайте с вопроса о самочувствии, не с продажи</li>
                <li><span class="check-box"></span>Пишите коротко — 3-5 предложений максимум</li>
                <li><span class="check-box"></span>Предлагайте конкретное время, не «как-нибудь»</li>
                <li><span class="check-box"></span>Не пишите чаще раза в 2-3 недели</li>
                <li><span class="check-box"></span>Если не отвечают 3 раза — остановитесь</li>
            </ul>
        </div>
        
        <div class="warning-box">
            <strong>Не делайте так:</strong> «Запись открыта! Жду вас!» — это спам. 
            Или: «Вы давно не были, может проблемы?» — это давление.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_templates };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-7-techniques
 * 
 * 7 приёмов удержания клиентов на сеансе
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_7_techniques(data, pageNum, totalPages) {
    
    // СТРАНИЦА 1: Приёмы 1-4
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>7 приёмов удержания клиентов</h2>
        
        <p class="lead">
            Возвращаемость клиентов начинается на сеансе, а не после него. 
            Вот что делать, чтобы клиент захотел прийти снова.
        </p>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Узнайте, зачем пришёл</div>
            </div>
            <div class="step-content">
                Перед сеансом спросите: «Что беспокоит? На что обратить внимание?» 
                Это показывает индивидуальный подход и помогает дать результат.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Комментируйте, что делаете</div>
            </div>
            <div class="step-content">
                «Здесь у вас сильное напряжение, сейчас проработаю» — 
                клиент понимает, что вы замечаете его проблемы и работаете с ними.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Спрашивайте обратную связь</div>
            </div>
            <div class="step-content">
                «Давление нормальное?», «Здесь сильнее или мягче?» — 
                клиент чувствует, что его слышат и подстраиваются под него.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">Давайте рекомендации</div>
            </div>
            <div class="step-content">
                «Дома можете делать вот это — поможет закрепить». 
                Это показывает экспертность и заботу о результате.
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    // СТРАНИЦА 2: Приёмы 5-7 + итог
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>7 приёмов удержания (продолжение)</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">5</div>
                <div class="step-title">Подведите итог</div>
            </div>
            <div class="step-content">
                «Сегодня хорошо проработали спину, в следующий раз уделим больше внимания шее» — 
                это создаёт ожидание следующего визита.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">6</div>
                <div class="step-title">Предложите записаться</div>
            </div>
            <div class="step-content">
                «Через 2 недели будет в самый раз повторить. Запишетесь сразу?» — 
                не ждите, пока клиент сам вспомнит.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">7</div>
                <div class="step-title">Запомните детали</div>
            </div>
            <div class="step-content">
                Записывайте после сеанса: что обсуждали, что беспокоило. 
                В следующий раз спросите: «Как та боль в плече, о которой говорили?»
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат</div>
            <div class="result-value">Возвращаемость +15-25%</div>
        </div>
        
        <div class="tip-box">
            <strong>Главный секрет:</strong> клиенты возвращаются не к массажисту, 
            а к человеку, который их помнит, понимает и заботится. 
            Техника важна, но отношение — важнее.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_7_techniques };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-automation
 * 
 * Автоматизация напоминаний клиентам
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_automation(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Автоматизация напоминаний</h2>
        
        <p class="lead">
            Когда клиентов становится много, сложно помнить, кому и когда писать. 
            Автоматизация решает эту проблему.
        </p>
        
        <h3>Что можно автоматизировать</h3>
        
        <div class="card card-green">
            <h4>Напоминание о визите</h4>
            <p>За 24 часа и за 2 часа до сеанса клиент получает сообщение: 
            «Напоминаем: завтра в 15:00 массаж у [имя]. Адрес: ...»</p>
            <p style="color: #888; margin-top: 8px;">Снижает неявки на 30-40%</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Просьба об отзыве</h4>
            <p>Через день после визита: «Спасибо за визит! Если понравилось — 
            оставьте отзыв: [ссылка]»</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Напоминание о повторном визите</h4>
            <p>Через 2-3 недели после сеанса: «Прошло 2 недели — как самочувствие? 
            Может, пора повторить?»</p>
        </div>
        
        <h3>Как настроить</h3>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>В CRM (YCLIENTS, Dikidi)</h4>
                <ul class="simple-list">
                    <li>Настройка за 15 минут</li>
                    <li>Всё работает автоматически</li>
                    <li>Можно менять тексты</li>
                    <li>Входит в тариф</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Вручную (без CRM)</h4>
                <ul class="simple-list">
                    <li>Напоминания в Google Календаре</li>
                    <li>Каждое воскресенье: кому писать на неделе</li>
                    <li>Шаблоны сообщений готовы</li>
                    <li>Занимает 15-20 мин в неделю</li>
                </ul>
            </div>
        </div>
        
        <h3>Настройка в Google Календаре (бесплатно)</h3>
        
        <div class="numbered-list">
            <li>После сеанса создайте событие на дату через 2-3 недели</li>
            <li>Название: «Напомнить: [Имя клиента]»</li>
            <li>В описание: телефон и что беспокоило</li>
            <li>Поставьте напоминание за 1 день</li>
            <li>Когда придёт уведомление — напишите клиенту</li>
        </div>
        
        <div class="tip-box">
            <strong>Совет:</strong> если у вас меньше 30 клиентов в месяц — 
            ручной вариант достаточен. Больше 30 — переходите на CRM, 
            иначе начнёте терять людей.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_automation };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-advanced
 * 
 * Продвинутое удержание для тех, у кого уже 40%+
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_advanced(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Продвинутое удержание: с 40% до 55%+</h2>
        
        <p class="lead">
            У вас уже неплохая возвращаемость — ${data.repeatRate || 45}%. 
            Это выше среднего. Теперь задача — довести до уровня топовых практик: 55-65%.
        </p>
        
        <h3>Что отличает топов</h3>
        
        <div class="card card-gold">
            <h4>Они создают привычку</h4>
            <p>Клиент приходит не «когда заболит», а регулярно — раз в 2-3 недели. 
            Это становится частью его жизни, как спортзал или парикмахер.</p>
        </div>
        
        <h3>Инструменты для роста</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Абонементы</div>
            </div>
            <div class="step-content">
                Предложите пакет из 5-10 сеансов со скидкой 10-15%. 
                Клиент заплатил — он точно придёт. А вы получили деньги вперёд.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Регулярная запись</div>
            </div>
            <div class="step-content">
                Предлагайте сразу записываться на следующий сеанс: 
                «Давайте сразу запишу вас через 2 недели? Вторник в это же время подойдёт?»
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Бонус за рекомендацию</div>
            </div>
            <div class="step-content">
                «Приведите друга — получите скидку 500 р. на следующий сеанс». 
                Клиент приводит новых, и сам возвращается за бонусом.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">VIP-статус для постоянных</div>
            </div>
            <div class="step-content">
                После 5-го визита: «Вы теперь мой VIP-клиент — приоритет в записи 
                и небольшой бонус к каждому сеансу». Это может быть +5 минут или скидка 5%.
            </div>
        </div>
        
        <h3>Метрики для отслеживания</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Показатель</th>
                    <th>Сейчас</th>
                    <th>Цель</th>
                </tr>
                <tr>
                    <td>Возвращаемость</td>
                    <td>${data.repeatRate || 45}%</td>
                    <td class="highlight">55-60%</td>
                </tr>
                <tr>
                    <td>Среднее визитов на клиента</td>
                    <td>2-3</td>
                    <td class="highlight">4-5</td>
                </tr>
                <tr>
                    <td>Клиенты с абонементом</td>
                    <td>-</td>
                    <td class="highlight">20-30%</td>
                </tr>
            </table>
        </div>
        
        <div class="tip-box">
            <strong>Главное:</strong> лучшее удержание — это когда клиент видит результат. 
            Все техники работают, только если вы хорошо делаете свою работу.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_advanced };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: retention-loyalty
 * 
 * Программа лояльности: абонементы, бонусы, скидки
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_retention_loyalty(data, pageNum, totalPages) {
    
    const price = data.privatePrice || 2500;
    const packagePrice = Math.round(price * 5 * 0.9);
    const savings = price * 5 - packagePrice;
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Программа лояльности</h2>
        
        <p class="lead">
            Программа лояльности мотивирует клиентов возвращаться и приводить друзей. 
            Вот простые варианты, которые работают.
        </p>
        
        <h3>Вариант 1: Абонементы</h3>
        
        <div class="card card-gold">
            <h4>Пакет из 5 сеансов</h4>
            <p>Обычная цена: ${(price * 5).toLocaleString('ru-RU')} р.</p>
            <p>Цена абонемента: <strong>${packagePrice.toLocaleString('ru-RU')} р.</strong> (скидка 10%)</p>
            <p style="color: #7ec8a3;">Клиент экономит ${savings.toLocaleString('ru-RU')} р.</p>
        </div>
        
        <div class="tip-box">
            <strong>Плюсы для вас:</strong> деньги вперёд, клиент точно придёт 5 раз, 
            проще планировать загрузку.
        </div>
        
        <h3>Вариант 2: Каждый N-й сеанс бесплатно</h3>
        
        <div class="card card-bordered">
            <h4>Каждый 6-й сеанс — в подарок</h4>
            <p>После 5 платных сеансов — 1 бесплатный. 
            Это скидка ~17%, но клиент получает её только после 5 визитов.</p>
            <p style="color: #888; margin-top: 8px;">
                Можно вести учёт на карточке: отмечаете каждый визит, 
                после 5 отметок — бесплатный.
            </p>
        </div>
        
        <h3>Вариант 3: Бонус за рекомендацию</h3>
        
        <div class="card card-bordered">
            <h4>Приведи друга — получи скидку</h4>
            <p>Если клиент приводит нового человека, оба получают бонус:</p>
            <ul class="simple-list">
                <li>Новый клиент: скидка 300-500 р. на первый сеанс</li>
                <li>Постоянный клиент: скидка 300-500 р. на следующий</li>
            </ul>
        </div>
        
        <h3>Как внедрить</h3>
        
        <div class="numbered-list">
            <li>Выберите один вариант — не все сразу</li>
            <li>Подготовьте простое объяснение для клиентов</li>
            <li>Предлагайте после 2-3 визита, когда клиент уже доволен</li>
            <li>Ведите учёт: кто купил абонемент, сколько визитов осталось</li>
        </div>
        
        <div class="warning-box">
            <strong>Не делайте:</strong> слишком сложные программы (накопительные баллы, 
            уровни, проценты от оборота). Чем проще — тем лучше работает.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_retention_loyalty };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: exit-calculator
 * 
 * Калькулятор перехода: когда можно уходить из салона
 * Используется в: salon-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_exit_calculator(data, pageNum, totalPages) {
    
    // Расчёты на основе данных пользователя
    const salonProfit = Math.round(data.salonPrice * data.salonClients * 4 * (data.salonPercent / 100));
    const privatePerClient = Math.round(data.salonPrice * 0.85); // примерно такой же чек, минус 15% расходов
    const targetClients = Math.ceil(salonProfit / (privatePerClient * 4));
    const safetyBuffer = Math.round(salonProfit * 3); // подушка на 3 месяца
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Калькулятор перехода</h2>
        
        <p class="lead">
            Главный вопрос: сколько частных клиентов нужно, чтобы уйти из салона 
            без потери дохода? Вот расчёт на основе ваших данных.
        </p>
        
        <h3>Ваша точка перехода</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <td>Ваш доход в салоне сейчас</td>
                    <td class="highlight">${salonProfit.toLocaleString('ru-RU')} р./мес</td>
                </tr>
                <tr>
                    <td>Чек в салоне</td>
                    <td>${data.salonPrice.toLocaleString('ru-RU')} р.</td>
                </tr>
                <tr>
                    <td>Ваш процент</td>
                    <td>${data.salonPercent}%</td>
                </tr>
                <tr>
                    <td>Клиентов в неделю</td>
                    <td>${data.salonClients}</td>
                </tr>
            </table>
        </div>
        
        <div class="result-box">
            <div class="result-label">Вам нужно набрать</div>
            <div class="result-value">${targetClients} клиентов в неделю</div>
        </div>
        
        <p style="text-align: center; color: #888; margin-bottom: 24px;">
            При таком же чеке и расходах ~15% на место
        </p>
        
        <h3>Формула расчёта</h3>
        
        <div class="card card-gold">
            <p style="font-family: monospace; font-size: 14px; color: #d4a574; margin-bottom: 12px;">
                Целевые клиенты = Текущий доход / (Чек × 0.85 × 4 недели)
            </p>
            <p style="color: #888; font-size: 14px;">
                Где 0.85 — это 85% от чека после вычета расходов на место (15%)
            </p>
        </div>
        
        <h3>Финансовая подушка</h3>
        
        <div class="card card-bordered">
            <p>Перед уходом рекомендую накопить подушку на 3 месяца расходов:</p>
            <div class="result-box" style="margin-top: 16px;">
                <div class="result-label">Минимальная подушка</div>
                <div class="result-value">${safetyBuffer.toLocaleString('ru-RU')} р.</div>
            </div>
            <p style="color: #888; font-size: 14px; margin-top: 12px;">
                Это страховка на случай, если первые месяцы пойдут медленнее, чем планировали.
            </p>
        </div>
        
        <div class="tip-box">
            <strong>Безопасный переход:</strong> не увольняйтесь, пока не наберёте 
            хотя бы 70% от целевого количества клиентов. То есть для вас это 
            ${Math.ceil(targetClients * 0.7)} клиентов в неделю на частной практике.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_exit_calculator };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: exit-timeline
 * 
 * План выхода по этапам: 4 этапа за 2-4 месяца
 * Используется в: salon-exit
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_exit_timeline(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>План выхода: 4 этапа</h2>
        
        <p class="lead">
            Уход из салона — не прыжок в пропасть, а постепенный переход. 
            Вы строите частную практику параллельно с работой, и уходите только 
            когда новый доход стабилен.
        </p>
        
        <div class="week-block">
            <div class="week-title">Этап 1: Подготовка (2-3 недели)</div>
            <div class="week-content">
                <p><strong>Цель:</strong> создать базу для частной практики, не привлекая внимания в салоне.</p>
                
                <ul class="simple-list">
                    <li>Определитесь, где будете принимать: дома, аренда кабинета или выезд</li>
                    <li>Зарегистрируйтесь на Авито, Яндекс.Картах, создайте профиль в соцсетях</li>
                    <li>Подготовьте фотографии для объявлений</li>
                    <li>Решите вопрос с самозанятостью или ИП — это важно для легальной работы</li>
                    <li>Начните откладывать на финансовую подушку</li>
                </ul>
                
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Результат этапа:</strong> всё готово для приёма первых клиентов
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Этап 2: Первые клиенты (4-6 недель)</div>
            <div class="week-content">
                <p><strong>Цель:</strong> получить первых частных клиентов и отзывы.</p>
                
                <ul class="simple-list">
                    <li>Опубликуйте объявления на всех площадках</li>
                    <li>Расскажите друзьям и знакомым, что принимаете частно</li>
                    <li>Принимайте клиентов вечерами и в выходные — параллельно с работой в салоне</li>
                    <li>Просите каждого клиента оставить отзыв</li>
                    <li>Записывайте все контакты в базу</li>
                </ul>
                
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Результат этапа:</strong> 3-5 частных клиентов в неделю, 5+ отзывов
                </p>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <div class="week-block">
            <div class="week-title">Этап 3: Наращивание (4-8 недель)</div>
            <div class="week-content">
                <p><strong>Цель:</strong> довести частную практику до целевого уровня.</p>
                
                <ul class="simple-list">
                    <li>Усиливайте работающие каналы: больше постов, обновление объявлений</li>
                    <li>Запустите сарафанное радио: просите клиентов рекомендовать вас</li>
                    <li>Внедрите систему возврата клиентов — напоминания через 2-3 недели</li>
                    <li>Если нужно — добавьте ещё один день для частных клиентов</li>
                    <li>Следите за финансами: записывайте доходы и расходы</li>
                </ul>
                
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Результат этапа:</strong> 70%+ от целевого количества клиентов, стабильный поток заявок
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Этап 4: Переход (1-2 недели)</div>
            <div class="week-content">
                <p><strong>Цель:</strong> корректно уйти из салона и полностью перейти на частную практику.</p>
                
                <ul class="simple-list">
                    <li>Проверьте чек-лист готовности (на следующей странице)</li>
                    <li>Поговорите с руководством — предупредите за 2 недели минимум</li>
                    <li>Не уводите клиентов салона — это испортит репутацию</li>
                    <li>Поблагодарите за опыт, сохраните хорошие отношения</li>
                    <li>Перенесите всю энергию на развитие своей практики</li>
                </ul>
                
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Результат этапа:</strong> вы работаете на себя
                </p>
            </div>
        </div>
        
        <h3>Общий таймлайн</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Этап</th>
                    <th>Срок</th>
                    <th>Ключевой результат</th>
                </tr>
                <tr>
                    <td>Подготовка</td>
                    <td>2-3 недели</td>
                    <td>Готова инфраструктура</td>
                </tr>
                <tr>
                    <td>Первые клиенты</td>
                    <td>4-6 недель</td>
                    <td>3-5 клиентов/нед, отзывы</td>
                </tr>
                <tr>
                    <td>Наращивание</td>
                    <td>4-8 недель</td>
                    <td>70% от цели</td>
                </tr>
                <tr>
                    <td>Переход</td>
                    <td>1-2 недели</td>
                    <td>Уход из салона</td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Итого</strong></td>
                    <td><strong>2-4 месяца</strong></td>
                </tr>
            </table>
        </div>
        
        <div class="tip-box">
            <strong>Не торопитесь.</strong> Лучше потратить лишний месяц на подготовку, 
            чем уйти раньше времени и остаться без дохода.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_exit_timeline };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: exit-checklist-12
 * 
 * Чек-лист "Готов ли я": 12 пунктов для безопасного ухода
 * Используется в: salon-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_exit_checklist_12(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Чек-лист: готовы ли вы к уходу</h2>
        
        <p class="lead">
            Пройдите по всем пунктам перед тем, как объявить об уходе. 
            Минимум 10 из 12 должны быть выполнены.
        </p>
        
        <div class="card card-bordered">
            <h4>Финансы</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть финансовая подушка на 3 месяца расходов</li>
                <li><span class="check-box"></span>Частная практика приносит минимум 70% от текущего дохода</li>
                <li><span class="check-box"></span>Понимаю свои расходы: аренда, расходники, налоги</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Клиенты</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть своя база клиентов (минимум 15-20 контактов)</li>
                <li><span class="check-box"></span>Есть постоянные клиенты, которые возвращаются</li>
                <li><span class="check-box"></span>Работают 2-3 канала привлечения новых клиентов</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Инфраструктура</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть место для приёма или отлажен выезд</li>
                <li><span class="check-box"></span>Есть всё оборудование: стол, масла, бельё</li>
                <li><span class="check-box"></span>Оформлена самозанятость или ИП</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Репутация</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть минимум 10 отзывов на площадках</li>
                <li><span class="check-box"></span>Не планирую уводить клиентов из салона</li>
                <li><span class="check-box"></span>Готов/а предупредить руководство за 2 недели</li>
            </ul>
        </div>
        
        <div class="divider"></div>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">10-12 пунктов</div>
                <div class="compare-value" style="color: #7ec8a3; font-size: 20px;">Можно уходить</div>
            </div>
            <div class="compare-box" style="border: 1px solid #f4a574;">
                <div class="compare-label">7-9 пунктов</div>
                <div class="compare-value" style="color: #f4a574; font-size: 20px;">Ещё 2-4 недели</div>
            </div>
            <div class="compare-box" style="border: 1px solid #e87e7e;">
                <div class="compare-label">Менее 7</div>
                <div class="compare-value" style="color: #e87e7e; font-size: 20px;">Рано</div>
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Важно про клиентов салона:</strong> не пытайтесь забрать их с собой. 
            Это неэтично, опасно для репутации и может привести к конфликту. 
            Стройте свою базу с нуля — это надёжнее.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_exit_checklist_12 };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: hybrid-exit-calculator
 * 
 * Калькулятор: сколько частных клиентов нужно, чтобы уйти из салона
 * Используется в: hybrid-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_hybrid_exit_calculator(data, pageNum, totalPages) {
    
    const expenseRate = data.expenseRate || 0.15;
    const salonProfit = Math.round(data.salonPrice * data.salonClients * 4 * (data.salonPercent / 100));
    const privateProfit = Math.round(data.privatePrice * data.privateClients * 4 * (1 - expenseRate));
    const totalProfit = salonProfit + privateProfit;
    
    const perClientPrivate = Math.round(data.privatePrice * (1 - expenseRate));
    const perClientSalon = Math.round(data.salonPrice * (data.salonPercent / 100));
    
    const targetPrivateClients = Math.ceil(totalProfit / (perClientPrivate * 4));
    const additionalClients = Math.max(0, targetPrivateClients - data.privateClients);
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Калькулятор: когда можно уйти из салона</h2>
        
        <p class="lead">
            У вас гибридный режим: салон + частная практика. 
            Вот расчёт, сколько частных клиентов нужно, чтобы полностью заменить доход от салона.
        </p>
        
        <h3>Ваш текущий доход</h3>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #d4a574;">
                <div class="compare-label">Салон</div>
                <div class="compare-value" style="color: #d4a574;">${salonProfit.toLocaleString('ru-RU')} р.</div>
                <div class="compare-sub">${data.salonClients} кл. × ${data.salonPercent}%</div>
            </div>
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">Частная</div>
                <div class="compare-value" style="color: #7ec8a3;">${privateProfit.toLocaleString('ru-RU')} р.</div>
                <div class="compare-sub">${data.privateClients} кл./нед</div>
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Общий доход сейчас</div>
            <div class="result-value">${totalProfit.toLocaleString('ru-RU')} р./мес</div>
        </div>
        
        <h3>Сравнение выгоды</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Показатель</th>
                    <th>Салон</th>
                    <th>Частная</th>
                </tr>
                <tr>
                    <td>Чек</td>
                    <td>${data.salonPrice.toLocaleString('ru-RU')} р.</td>
                    <td>${data.privatePrice.toLocaleString('ru-RU')} р.</td>
                </tr>
                <tr>
                    <td>Вам остаётся</td>
                    <td>${perClientSalon.toLocaleString('ru-RU')} р.</td>
                    <td class="highlight">${perClientPrivate.toLocaleString('ru-RU')} р.</td>
                </tr>
                <tr>
                    <td>Разница</td>
                    <td colspan="2" class="highlight">Частный клиент выгоднее на ${Math.round((perClientPrivate / perClientSalon - 1) * 100)}%</td>
                </tr>
            </table>
        </div>
        
        <h3>Точка перехода</h3>
        
        <div class="result-box result-box-green">
            <div class="result-label">Нужно частных клиентов в неделю</div>
            <div class="result-value">${targetPrivateClients}</div>
        </div>
        
        <div class="card card-gold">
            <p>Сейчас у вас ${data.privateClients} частных клиентов в неделю.</p>
            <p style="margin-top: 8px;">
                <strong>Нужно добавить ещё ${additionalClients}</strong> — тогда можно уходить из салона 
                без потери общего дохода.
            </p>
        </div>
        
        <div class="tip-box">
            <strong>Безопасный переход:</strong> наберите хотя бы ${Math.ceil(targetPrivateClients * 0.8)} 
            частных клиентов в неделю, прежде чем увольняться. Это даст запас на случай колебаний.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_hybrid_exit_calculator };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: hybrid-exit-timeline
 * 
 * План перехода для гибрида: наращивание частной практики
 * Используется в: hybrid-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_hybrid_exit_timeline(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>План перехода на частную практику</h2>
        
        <p class="lead">
            У вас уже есть частные клиенты — это большое преимущество. 
            Задача: нарастить их количество до точки, когда салон станет необязательным.
        </p>
        
        <div class="week-block">
            <div class="week-title">Месяц 1: Усиление каналов</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Обновите объявления на Авито и Яндекс.Картах</li>
                    <li>Добавьте новые фотографии, актуализируйте цены</li>
                    <li>Попросите всех текущих клиентов оставить отзывы</li>
                    <li>Начните регулярно вести соцсети (3 поста в неделю)</li>
                    <li>Выделите дополнительное время на частных клиентов</li>
                </ul>
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Цель:</strong> +2-3 новых клиента в неделю
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Месяц 2: Удержание и рост</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Внедрите систему возврата: напоминания через 2-3 недели</li>
                    <li>Запустите сарафанное радио: просите рекомендовать вас</li>
                    <li>Если работаете дома — рассмотрите аренду кабинета на выходные</li>
                    <li>Отслеживайте, какой канал даёт больше клиентов — усильте его</li>
                </ul>
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Цель:</strong> стабильный поток, возвращаемость 40%+
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Месяц 3: Подготовка к переходу</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Проверьте финансы: есть ли подушка на 2-3 месяца</li>
                    <li>Убедитесь, что частная практика даёт 80%+ от целевого дохода</li>
                    <li>Определите дату разговора с руководством салона</li>
                    <li>Подготовьте расписание на полную загрузку частной практикой</li>
                </ul>
                <p style="color: #7ec8a3; margin-top: 12px;">
                    <strong>Цель:</strong> готовность к уходу
                </p>
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Не сжигайте мосты.</strong> Уходите из салона корректно: предупредите за 2 недели, 
            поблагодарите за опыт, не уводите клиентов. Мир массажа тесен, репутация важна.
        </div>
        
        <div class="tip-box">
            <strong>Если не успеваете за 3 месяца</strong> — это нормально. 
            У кого-то переход занимает полгода. Главное — двигаться в правильном направлении.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_hybrid_exit_timeline };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: negotiate-script
 * 
 * Скрипт разговора с руководством о повышении процента
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_negotiate_script(data, pageNum, totalPages) {
    
    const currentPercent = data.salonPercent || 40;
    const targetPercent = Math.min(currentPercent + 10, 60);
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Скрипт: как попросить повышение процента</h2>
        
        <p class="lead">
            Разговор о деньгах — это переговоры. К ним нужно подготовиться. 
            Вот структура разговора, которая работает.
        </p>
        
        <h3>Когда говорить</h3>
        
        <div class="card card-bordered">
            <ul class="simple-list">
                <li>После успешного месяца (много клиентов, хорошие отзывы)</li>
                <li>Когда руководитель в хорошем настроении</li>
                <li>В начале месяца, не в конце</li>
                <li>Один на один, не при других мастерах</li>
            </ul>
        </div>
        
        <h3>Структура разговора</h3>
        
        <div class="script-box">
            <div class="script-label">Начало — без наезда</div>
            <div class="script-text">«[Имя], можно поговорить? Хотела обсудить условия работы. 
Мне нравится работать здесь, я планирую остаться. 
Но хочу обсудить процент.»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Аргументы — факты, не эмоции</div>
            <div class="script-text">«За последние 3 месяца ко мне записались [X] постоянных клиентов, 
которые просят именно меня. У меня [Y] положительных отзывов. 
Я приношу салону стабильную выручку.

Сейчас мой процент ${currentPercent}%. Считаю, что справедливо было бы ${targetPercent}%.»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Если возражают</div>
            <div class="script-text">«Понимаю, что у салона тоже расходы. Может, найдём компромисс? 
Например, ${currentPercent + 5}% сейчас, а через 3 месяца пересмотрим?

Или: процент выше на клиентов, которые приходят именно ко мне по записи?»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Завершение</div>
            <div class="script-text">«Спасибо, что выслушали. Дайте знать, когда будет решение. 
Я готова продолжать работать и приносить результат.»</div>
        </div>
        
        <h3>Чего не делать</h3>
        
        <div class="warning-box">
            <ul class="simple-list">
                <li><strong>Не угрожайте уходом</strong> — если не готовы уйти на самом деле</li>
                <li><strong>Не сравнивайте с другими мастерами</strong> — это конфликт</li>
                <li><strong>Не жалуйтесь</strong> — «мне не хватает денег» не аргумент</li>
                <li><strong>Не просите слишком много сразу</strong> — +10% максимум за раз</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Если отказали:</strong> спросите, что нужно сделать, чтобы получить повышение 
            через 3 месяца. Зафиксируйте ответ. Через 3 месяца вернитесь с результатами.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_negotiate_script };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: negotiate-arguments
 * 
 * Аргументы для повышения процента
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_negotiate_arguments(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Аргументы для повышения процента</h2>
        
        <p class="lead">
            Руководитель думает цифрами. Эмоции («я стараюсь», «мне мало») не работают. 
            Вот аргументы, которые имеют вес.
        </p>
        
        <h3>Сильные аргументы</h3>
        
        <div class="card card-gold">
            <h4>Постоянные клиенты</h4>
            <p>«Ко мне записываются повторно [X] клиентов в месяц. Они просят именно меня. 
            Это стабильная выручка для салона, которую приношу я.»</p>
            <p style="color: #7ec8a3; margin-top: 8px;">Как подготовить: начните записывать, сколько клиентов возвращаются именно к вам.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Положительные отзывы</h4>
            <p>«На Яндекс.Картах салона [X] отзывов, из них [Y] упоминают меня по имени. 
            Это привлекает новых клиентов.»</p>
            <p style="color: #7ec8a3; margin-top: 8px;">Как подготовить: попросите клиентов оставлять отзывы и упоминать ваше имя.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Загрузка</h4>
            <p>«Я работаю [X] дней в неделю, загружена на [Y]%. Это выше среднего по салону. 
            Высокая загрузка = высокий вклад в общую выручку.»</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Рыночные условия</h4>
            <p>«В других салонах города массажисты моего уровня получают [X-Y]%. 
            Я не хочу уходить, но хочу работать на справедливых условиях.»</p>
            <p style="color: #7ec8a3; margin-top: 8px;">Как подготовить: узнайте условия в 2-3 других салонах (можно позвонить как клиент).</p>
        </div>
        
        <h3>Слабые аргументы (не используйте)</h3>
        
        <div class="warning-box">
            <ul class="simple-list">
                <li>«Мне не хватает на жизнь» — это ваша проблема, не салона</li>
                <li>«Я давно работаю» — стаж без результатов не аргумент</li>
                <li>«У Маши больше процент» — сравнение с коллегами создаёт конфликт</li>
                <li>«Я уйду, если не поднимете» — ультиматум работает один раз, и то не всегда</li>
            </ul>
        </div>
        
        <h3>Подготовьте цифры</h3>
        
        <div class="card card-bordered">
            <p>Перед разговором соберите:</p>
            <ul class="checklist">
                <li><span class="check-box"></span>Сколько клиентов приняли за последние 3 месяца</li>
                <li><span class="check-box"></span>Сколько из них — повторные (пришли именно к вам)</li>
                <li><span class="check-box"></span>Сколько отзывов с вашим именем</li>
                <li><span class="check-box"></span>Ваш процент загрузки (часов работы / доступных часов)</li>
                <li><span class="check-box"></span>Условия в других салонах (для сравнения)</li>
            </ul>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_negotiate_arguments };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: negotiate-timing
 * 
 * Когда и как выбрать момент для разговора о проценте
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_negotiate_timing(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Когда говорить о повышении процента</h2>
        
        <p class="lead">
            Правильный момент — половина успеха. Тот же самый разговор может закончиться 
            по-разному в зависимости от того, когда вы его начали.
        </p>
        
        <h3>Хорошее время</h3>
        
        <div class="card card-green">
            <ul class="simple-list">
                <li><strong>После удачного месяца</strong> — много клиентов, хорошие отзывы, 
                руководство видит вашу ценность</li>
                <li><strong>В начале месяца</strong> — есть время обдумать и внедрить с нового периода</li>
                <li><strong>После похвалы</strong> — если вас недавно похвалили, это хороший фон</li>
                <li><strong>Когда в салоне всё спокойно</strong> — нет авралов, конфликтов, увольнений</li>
                <li><strong>На запланированной встрече</strong> — попросите 15 минут отдельно, не на бегу</li>
            </ul>
        </div>
        
        <h3>Плохое время</h3>
        
        <div class="card" style="border: 1px solid #f4a574;">
            <ul class="simple-list">
                <li><strong>Когда в салоне проблемы</strong> — падение выручки, конфликты, текучка</li>
                <li><strong>В конце месяца</strong> — обычно много стресса с отчётами</li>
                <li><strong>Сразу после вашей ошибки</strong> — опоздания, жалобы клиентов</li>
                <li><strong>В присутствии других</strong> — это личный разговор</li>
                <li><strong>На эмоциях</strong> — если вы раздражены или обижены</li>
            </ul>
        </div>
        
        <h3>Как подготовить почву</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">За 2-4 недели до разговора</div>
            </div>
            <div class="step-content">
                Начните собирать аргументы: записывайте постоянных клиентов, 
                попросите клиентов оставить отзывы, зафиксируйте свою загрузку.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">За неделю</div>
            </div>
            <div class="step-content">
                Попросите о встрече: «Можно поговорить на этой неделе? Хочу обсудить 
                условия работы. Когда удобно?» Это даст и вам, и руководству время подготовиться.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Перед разговором</div>
            </div>
            <div class="step-content">
                Проговорите свои аргументы вслух. Подготовьте ответы на возможные возражения. 
                Определите минимум, на который согласны.
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Важно:</strong> если вам отказали — это не конец. Спросите, что нужно сделать 
            для повышения, зафиксируйте ответ, вернитесь через 2-3 месяца с результатами.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_negotiate_timing };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: negotiate-prepare
 * 
 * Подготовка к переговорам о проценте
 * Используется в: salon-grow (когда salonPercent < 50, но ещё не готовы к разговору)
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_negotiate_prepare(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Подготовка к переговорам о проценте</h2>
        
        <p class="lead">
            Пока рано говорить о повышении — сначала нужно усилить позицию. 
            Вот что сделать в ближайшие 4-6 недель.
        </p>
        
        <h3>План подготовки</h3>
        
        <div class="week-block">
            <div class="week-title">Недели 1-2: Начните вести учёт</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Заведите таблицу или блокнот для записи постоянных клиентов</li>
                    <li>Отмечайте: кто пришёл повторно, кто просил именно вас при записи</li>
                    <li>Считайте количество клиентов в неделю</li>
                </ul>
                <p style="color: #d4a574; margin-top: 12px;">
                    Цель: через месяц у вас будут конкретные цифры для разговора
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Недели 2-4: Соберите отзывы</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Попросите 5-7 довольных клиентов оставить отзыв на Яндекс.Картах</li>
                    <li>Просите упомянуть ваше имя: «Была у [вашего имени], рекомендую»</li>
                    <li>Скриншотьте отзывы — пригодятся для разговора</li>
                </ul>
                <p style="color: #d4a574; margin-top: 12px;">
                    Цель: 5+ отзывов с вашим именем
                </p>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Недели 4-6: Узнайте рынок</div>
            <div class="week-content">
                <ul class="simple-list">
                    <li>Позвоните в 2-3 других салона как клиент, узнайте цены</li>
                    <li>Спросите знакомых массажистов, какой процент у них</li>
                    <li>Посмотрите вакансии салонов — там часто указывают условия</li>
                </ul>
                <p style="color: #d4a574; margin-top: 12px;">
                    Цель: знать, сколько платят в других местах
                </p>
            </div>
        </div>
        
        <h3>Что у вас будет к разговору</h3>
        
        <div class="card card-bordered">
            <ul class="checklist">
                <li><span class="check-box"></span>Количество постоянных клиентов за месяц</li>
                <li><span class="check-box"></span>Процент загрузки (сколько часов работаете из возможных)</li>
                <li><span class="check-box"></span>5+ отзывов с вашим именем</li>
                <li><span class="check-box"></span>Информация об условиях в других салонах</li>
                <li><span class="check-box"></span>Понимание, какой процент хотите и на какой минимум согласны</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>После подготовки</strong> — назначьте встречу с руководством. 
            С цифрами и фактами разговор пойдёт совсем иначе.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_negotiate_prepare };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: raise-price-strategy
 * 
 * Стратегия повышения цены: когда и как повышать
 * Используется в: hybrid-exit, hybrid-grow, private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_raise_price_strategy(data, pageNum, totalPages) {
    
    const currentPrice = data.privatePrice || 2000;
    const marketPrice = data.marketPrice || 2500;
    const suggestedPrice = Math.round(marketPrice * 1.0); // на уровне рынка для начала
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как поднять цену без потери клиентов</h2>
        
        <p class="lead">
            Низкая цена — это не конкурентное преимущество, а ловушка. 
            Вы работаете больше, зарабатываете меньше, и привлекаете клиентов, 
            которые ищут «подешевле».
        </p>
        
        <h3>Ваша ситуация</h3>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #f4a574;">
                <div class="compare-label">Ваш чек</div>
                <div class="compare-value" style="color: #f4a574;">${currentPrice.toLocaleString('ru-RU')} р.</div>
            </div>
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">Рынок</div>
                <div class="compare-value" style="color: #7ec8a3;">${marketPrice.toLocaleString('ru-RU')} р.</div>
            </div>
        </div>
        
        <h3>Главное правило</h3>
        
        <div class="card card-gold">
            <p style="font-size: 17px; color: #fff;">
                <strong>Повышайте цену только для новых клиентов.</strong>
            </p>
            <p style="margin-top: 12px;">
                Текущие клиенты пришли на старых условиях — оставьте им старую цену 
                или предупредите за месяц. Новые клиенты не знают, сколько стоило раньше.
            </p>
        </div>
        
        <h3>Пошаговая стратегия</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Поднимите цену в объявлениях</div>
            </div>
            <div class="step-content">
                Обновите Авито, Яндекс.Карты, соцсети. Поставьте новую цену — 
                ${suggestedPrice.toLocaleString('ru-RU')} р. или сразу рыночную. Это займёт 15 минут.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Называйте новую цену новым клиентам</div>
            </div>
            <div class="step-content">
                Когда спрашивают «сколько стоит» — называйте новую цену уверенно. 
                Без извинений, без оправданий. Цена — это цена.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Текущим клиентам — через месяц</div>
            </div>
            <div class="step-content">
                Предупредите заранее: «С [дата] стоимость сеанса будет [новая цена]. 
                Для вас как для постоянного клиента — ещё месяц по старой.»
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Страх «все уйдут» — преувеличен.</strong> Практика показывает: 
            при повышении на 15-20% уходит 5-10% клиентов. Но доход всё равно растёт.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_raise_price_strategy };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: raise-price-scripts
 * 
 * Скрипты: как сообщить о повышении и ответить на "дорого"
 * Используется в: hybrid-exit, hybrid-grow, private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_raise_price_scripts(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Скрипты для повышения цены</h2>
        
        <p class="lead">
            Готовые фразы для разных ситуаций. Главное — говорить спокойно и уверенно, 
            без извинений.
        </p>
        
        <h3>Как сообщить текущим клиентам</h3>
        
        <div class="script-box">
            <div class="script-label">Личное сообщение</div>
            <div class="script-text">«[Имя], здравствуйте! Хочу предупредить: с [дата] стоимость 
сеанса будет [новая цена] р. Это связано с ростом расходов на аренду 
и расходники. Для вас как для постоянного клиента — до [дата] 
по прежней цене. Спасибо, что с нами!»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Устно после сеанса</div>
            <div class="script-text">«Кстати, хочу предупредить: со следующего месяца 
немного поднимаю цену — будет [сумма]. Вас это касается 
только с [дата], ещё три сеанса по старой.»</div>
        </div>
        
        <h3>Как отвечать на «дорого»</h3>
        
        <div class="script-box">
            <div class="script-label">Вариант 1: Сравнение</div>
            <div class="script-text">«Понимаю. Цена на уровне рынка для [вашего города]. 
Можете сравнить — у массажистов с похожим опытом примерно так же. 
Но решать, конечно, вам.»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Вариант 2: Ценность</div>
            <div class="script-text">«Да, это не самый дешёвый вариант. Но за эти деньги 
вы получаете [качественную проработку / индивидуальный подход / 
мой опыт N лет]. Многие клиенты говорят, что разница чувствуется.»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Вариант 3: Спокойный отказ</div>
            <div class="script-text">«Понимаю, что не всем подходит по бюджету — это нормально. 
Если что, обращайтесь, когда будет удобно.»</div>
        </div>
        
        <h3>Чего не делать</h3>
        
        <div class="warning-box">
            <ul class="simple-list">
                <li><strong>Не извиняйтесь:</strong> «Простите, но я вынуждена поднять...» — это слабая позиция</li>
                <li><strong>Не оправдывайтесь долго:</strong> короткое объяснение достаточно</li>
                <li><strong>Не торгуйтесь:</strong> если сразу снизите — клиент поймёт, что цена «надутая»</li>
                <li><strong>Не обесценивайте себя:</strong> «Ну, может, я не стою столько...»</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Помните:</strong> клиент, который уходит из-за повышения на 300-500 р., 
            скорее всего, ушёл бы при первой возможности. Вы освобождаете место для тех, 
            кто ценит вашу работу.
        </p>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_raise_price_scripts };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: raise-price-faq
 * 
 * FAQ: ответы на частые страхи о повышении цены
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_raise_price_faq(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Страхи о повышении цены: разбираем</h2>
        
        <p class="lead">
            Большинство массажистов годами сидят на низкой цене из-за страхов, 
            которые не подтверждаются на практике. Давайте разберём их.
        </p>
        
        <div class="card card-bordered">
            <h4>«Все клиенты уйдут»</h4>
            <p style="color: #888; margin-bottom: 12px;">Реальность:</p>
            <p>При повышении на 15-20% уходит 5-10% клиентов. Обычно это те, кто и так 
            искал «где подешевле» и ушёл бы рано или поздно. Оставшиеся 90% приносят 
            больше денег, а у вас освобождается время для новых клиентов по новой цене.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>«Я ещё не достаточно хороша для такой цены»</h4>
            <p style="color: #888; margin-bottom: 12px;">Реальность:</p>
            <p>Цена не определяется только мастерством. Она определяется рынком, вашими расходами 
            и тем, сколько клиент готов платить за решение своей проблемы. Массажисты с меньшим 
            опытом часто берут больше — просто потому что не боятся.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>«В моём городе никто не платит столько»</h4>
            <p style="color: #888; margin-bottom: 12px;">Реальность:</p>
            <p>В любом городе есть люди с разным бюджетом. Да, не все готовы платить выше среднего. 
            Но вам не нужны «все» — вам нужны 15-20 клиентов в неделю. Они найдутся.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>«Сначала наберу больше клиентов, потом подниму»</h4>
            <p style="color: #888; margin-bottom: 12px;">Реальность:</p>
            <p>Это ловушка. Чем больше клиентов по низкой цене — тем сложнее поднять. 
            Каждому придётся сообщать, каждый может уйти. Проще сразу привлекать по нормальной цене.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>«Мне неловко называть высокую цену»</h4>
            <p style="color: #888; margin-bottom: 12px;">Реальность:</p>
            <p>Это вопрос практики. Первые 5-10 раз будет некомфортно. Потом привыкнете. 
            Попробуйте проговорить новую цену вслух 20 раз перед зеркалом — серьёзно, это работает.</p>
        </div>
        
        <div class="result-box result-box-green">
            <div class="result-label">Главная мысль</div>
            <div class="result-value" style="font-size: 22px;">Цена — это просто цифра</div>
        </div>
        
        <p style="text-align: center; color: #888;">
            Клиент не знает, сколько «должен» стоить массаж. Он ориентируется на то, 
            что вы ему скажете.
        </p>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_raise_price_faq };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: raise-price-premium
 * 
 * Как обосновать цену выше рынка
 * Используется в: private-grow (при цене около рынка)
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_raise_price_premium(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как брать выше рынка</h2>
        
        <p class="lead">
            Ваша цена уже на уровне рынка — это хорошо. Но можно больше. 
            Для этого нужно не просто поднять цифру, а создать ощущение премиум-услуги.
        </p>
        
        <h3>Что отличает премиум</h3>
        
        <p>Клиент платит больше не за «лучший массаж», а за весь опыт:</p>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>Сервис</h4>
                <ul class="simple-list">
                    <li>Быстрые ответы на сообщения</li>
                    <li>Напоминание перед визитом</li>
                    <li>Чай/вода после сеанса</li>
                    <li>Чистое бельё, приятный запах</li>
                    <li>Вопрос о самочувствии после</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Упаковка</h4>
                <ul class="simple-list">
                    <li>Профессиональные фото в профиле</li>
                    <li>Грамотные тексты в объявлениях</li>
                    <li>Чёткое описание услуг</li>
                    <li>Отзывы с конкретными результатами</li>
                    <li>Аккуратный внешний вид</li>
                </ul>
            </div>
        </div>
        
        <h3>Как перейти на +15-20% к рынку</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Добавьте одну премиум-услугу</div>
            </div>
            <div class="step-content">
                Например, «комплексный массаж 90 минут» с ценой выше обычной. 
                Или «массаж с ароматерапией». Это сразу поднимает средний чек.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Улучшите точки контакта</div>
            </div>
            <div class="step-content">
                Переснимите фотографии, перепишите описание услуг (уберите «дёшево», добавьте 
                конкретику про результат), обновите профиль.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Поднимите цену для новых</div>
            </div>
            <div class="step-content">
                Новые клиенты не знают, сколько стоило раньше. Просто поставьте новую цену. 
                Следите за конверсией — если не падает, можно ещё.
            </div>
        </div>
        
        <h3>Признаки того, что цена слишком низкая</h3>
        
        <div class="card card-bordered">
            <ul class="checklist">
                <li><span class="check-box"></span>Вы загружены на 100% и не успеваете отдыхать</li>
                <li><span class="check-box"></span>Клиенты никогда не говорят «дорого»</li>
                <li><span class="check-box"></span>Все соглашаются на запись с первого раза</li>
                <li><span class="check-box"></span>Вы зарабатываете меньше, чем хотите, при полной загрузке</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Если хотя бы 2 пункта про вас</strong> — вы точно можете поднять цену на 10-15% 
            уже сейчас.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_raise_price_premium };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: raise-price-positioning
 * 
 * Премиум-позиционирование: создание образа эксперта
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_raise_price_positioning(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Позиционирование: как стать «дорогим» специалистом</h2>
        
        <p class="lead">
            Клиент готов платить больше, если воспринимает вас как эксперта, 
            а не просто «массажиста из объявления». Вот как создать это восприятие.
        </p>
        
        <h3>Элементы экспертного позиционирования</h3>
        
        <div class="card card-gold">
            <h4>Специализация</h4>
            <p>Не «делаю любой массаж», а «специализируюсь на работе со спиной и шеей 
            для тех, кто много сидит за компьютером». Узкая специализация = выше экспертность в глазах клиента.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Конкретные результаты</h4>
            <p>Не «снимаю напряжение», а «после курса из 5 сеансов клиенты отмечают, 
            что перестала болеть голова по вечерам». Конкретика убеждает лучше, чем общие слова.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Социальные доказательства</h4>
            <ul class="simple-list">
                <li>Отзывы с описанием проблемы и результата</li>
                <li>Фото (если клиенты разрешают)</li>
                <li>Количество лет в практике</li>
                <li>Обучение, сертификаты, повышение квалификации</li>
            </ul>
        </div>
        
        <h3>Как переписать описание услуг</h3>
        
        <div class="two-cols">
            <div class="card" style="border: 1px solid #f4a574;">
                <h4 style="color: #f4a574;">Было</h4>
                <p style="font-size: 14px;">«Массаж спины. 60 минут. 2500 р. Запись по телефону.»</p>
            </div>
            <div class="card" style="border: 1px solid #7ec8a3;">
                <h4 style="color: #7ec8a3;">Стало</h4>
                <p style="font-size: 14px;">«Массаж для тех, у кого затекает спина от сидячей работы. 
За 60 минут проработаю воротниковую зону, плечи и поясницу — 
уйдёте с ощущением, что спина наконец расслабилась. 
Опыт 5 лет, работаю с глубокими мышечными блоками.»</p>
            </div>
        </div>
        
        <h3>Быстрые улучшения</h3>
        
        <div class="numbered-list">
            <li>Добавьте в описание, с какими проблемами работаете (боль в пояснице, головные боли, 
            восстановление после спорта)</li>
            <li>Укажите опыт в годах и количество клиентов («за 5 лет провела 3000+ сеансов»)</li>
            <li>Напишите один пост в соцсетях о том, как помогли конкретному клиенту</li>
            <li>Попросите 3-5 клиентов написать развёрнутые отзывы с описанием результата</li>
        </div>
        
        <div class="tip-box">
            <strong>Это не хвастовство</strong> — это информация, которая помогает клиенту 
            принять решение. Без неё он выбирает по цене. С ней — по ценности.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_raise_price_positioning };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: loyal-clients-7-techniques
 * 
 * 7 приёмов на сеансе для создания «своих» клиентов
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_loyal_clients_7_techniques(data, pageNum, totalPages) {
    
    // СТРАНИЦА 1: Приёмы 1-4
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>7 приёмов: как создать «своих» клиентов в салоне</h2>
        
        <p class="lead">
            Ваша задача — чтобы клиенты просили записать именно к вам, а не «к любому свободному». 
            Вот конкретные приёмы, которые работают.
        </p>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Запоминайте имена и детали</div>
            </div>
            <div class="step-content">
                «Как ваша спина после прошлого раза?», «Как поездка в Сочи?» — 
                это показывает, что вы помните человека. Записывайте в телефон после сеанса: 
                имя, что обсуждали, что беспокоило.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Объясняйте, что делаете</div>
            </div>
            <div class="step-content">
                «Сейчас проработаю воротниковую зону — здесь у вас основное напряжение» — 
                клиент чувствует индивидуальный подход, а не конвейер.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Давайте рекомендации</div>
            </div>
            <div class="step-content">
                «Дома можете делать вот это упражнение — поможет закрепить результат» — 
                это показывает экспертность и заботу. Клиент понимает, что вы хотите ему помочь.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">Спрашивайте обратную связь</div>
            </div>
            <div class="step-content">
                «Как давление?», «Удобно?», «Эту зону проработать сильнее?» — 
                клиент чувствует, что его слышат. Это отличает вас от тех, кто работает молча.
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    // СТРАНИЦА 2: Приёмы 5-7 + итог
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>7 приёмов для «своих» клиентов (продолжение)</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">5</div>
                <div class="step-title">Завершайте с итогом</div>
            </div>
            <div class="step-content">
                «Сегодня хорошо проработали спину. В следующий раз уделю больше внимания 
                пояснице — там есть над чем поработать» — это создаёт ожидание следующего визита.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">6</div>
                <div class="step-title">Предлагайте записаться снова</div>
            </div>
            <div class="step-content">
                «Запишетесь через 2 недели? Как раз пора будет повторить» — 
                не ждите, пока клиент сам додумается. Предлагайте конкретное время.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">7</div>
                <div class="step-title">Будьте собой</div>
            </div>
            <div class="step-content">
                Не нужно быть роботом по скрипту. Шутите, если это уместно. 
                Делитесь немного о себе. Люди возвращаются к людям, а не к «специалистам».
            </div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат через 2-3 месяца</div>
            <div class="result-value">30-40% клиентов просят именно вас</div>
        </div>
        
        <div class="tip-box">
            <strong>Это ваш главный актив:</strong> «свои» клиенты — это стабильность. 
            Они не уйдут к другому мастеру, они рекомендуют вас друзьям, 
            и они — основа для перехода на частную практику, если решите.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_loyal_clients_7_techniques };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: loyal-clients-templates
 * 
 * Шаблоны сообщений для работы с клиентами в салоне
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_loyal_clients_templates(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Шаблоны сообщений для клиентов салона</h2>
        
        <p class="lead">
            Даже работая в салоне, можно поддерживать связь со «своими» клиентами. 
            Это укрепляет лояльность и помогает, чтобы они просили именно вас.
        </p>
        
        <h3>После сеанса (на следующий день)</h3>
        
        <div class="template-box">
            <div class="template-title">Короткое сообщение</div>
            <div class="template-content">[Имя], добрый день! Это [ваше имя] из [название салона].
Как самочувствие после вчерашнего массажа? 
Если будут вопросы — пишите.</div>
        </div>
        
        <div class="tip-box">
            <strong>Важно:</strong> обязательно представляйтесь и упоминайте салон. 
            Клиент может не сохранить ваш номер.
        </div>
        
        <h3>Напоминание о записи (через 3-4 недели)</h3>
        
        <div class="template-box">
            <div class="template-title">Мягкое напоминание</div>
            <div class="template-content">[Имя], здравствуйте! Это [имя] из [салон].
Прошло уже 3 недели — как спина? 
Если хотите повторить, я работаю [дни]. 
Могу записать на удобное время.</div>
        </div>
        
        <h3>Поздравление с праздником</h3>
        
        <div class="template-box">
            <div class="template-title">Личное поздравление</div>
            <div class="template-content">[Имя], с праздником!
Желаю здоровья и хорошего настроения.
Буду рада видеть вас снова в [салон].
С теплом, [ваше имя]</div>
        </div>
        
        <h3>Правила переписки</h3>
        
        <div class="card card-bordered">
            <ul class="checklist">
                <li><span class="check-box"></span>Всегда представляйтесь и упоминайте салон</li>
                <li><span class="check-box"></span>Пишите не чаще раза в 3-4 недели</li>
                <li><span class="check-box"></span>Не навязывайтесь — если не отвечают 2 раза, остановитесь</li>
                <li><span class="check-box"></span>Записывайте клиентов через салон, не мимо него</li>
                <li><span class="check-box"></span>Не переманивайте клиентов на частную практику</li>
            </ul>
        </div>
        
        <div class="warning-box">
            <strong>Этика:</strong> вы работаете в салоне, и эти клиенты — клиенты салона. 
            Общение помогает укрепить вашу позицию, но не должно вредить салону. 
            Не предлагайте клиентам приходить к вам «мимо кассы».
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_loyal_clients_templates };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: track-loyal-clients
 * 
 * Как отслеживать «своих» клиентов в салоне
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_track_loyal_clients(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как отслеживать постоянных клиентов</h2>
        
        <p class="lead">
            Чтобы обосновать повышение процента, нужны цифры. 
            Вот простая система учёта «своих» клиентов.
        </p>
        
        <h3>Кто считается «вашим» клиентом</h3>
        
        <div class="card card-gold">
            <ul class="simple-list">
                <li>Просит записать именно к вам при записи</li>
                <li>Приходит повторно (2+ раза) именно к вам</li>
                <li>Рекомендует вас знакомым</li>
                <li>Спрашивает ваш график, чтобы подстроиться</li>
            </ul>
        </div>
        
        <h3>Как вести учёт</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Простая таблица в телефоне</div>
            </div>
            <div class="step-content">
                Создайте заметку или таблицу в Google Sheets. Столбцы: 
                Имя | Телефон | Дата визита | Повторный? | Просил меня?
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Заполняйте после каждого сеанса</div>
            </div>
            <div class="step-content">
                Это занимает 30 секунд. Через месяц у вас будет полная картина: 
                сколько клиентов, сколько из них повторных, сколько просят именно вас.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Считайте раз в месяц</div>
            </div>
            <div class="step-content">
                Посчитайте: всего клиентов за месяц, из них повторных, из них просили вас. 
                Это и есть ваши аргументы для разговора о проценте.
            </div>
        </div>
        
        <h3>Что отслеживать</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Показатель</th>
                    <th>Как считать</th>
                    <th>Норма</th>
                </tr>
                <tr>
                    <td>Всего клиентов/мес</td>
                    <td>Количество сеансов</td>
                    <td>40-80</td>
                </tr>
                <tr>
                    <td>Повторные клиенты</td>
                    <td>Были 2+ раза</td>
                    <td>30-50%</td>
                </tr>
                <tr>
                    <td>Просят именно вас</td>
                    <td>При записи называют имя</td>
                    <td>20-40%</td>
                </tr>
                <tr>
                    <td>По рекомендации</td>
                    <td>Пришли от вашего клиента</td>
                    <td>5-15%</td>
                </tr>
            </table>
        </div>
        
        <div class="tip-box">
            <strong>Через 2-3 месяца</strong> у вас будут цифры: «Ко мне записались 50 клиентов, 
            из них 20 просили именно меня, 15 пришли повторно». Это сильный аргумент 
            для разговора о проценте.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_track_loyal_clients };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: client-base-template
 * 
 * Шаблон базы клиентов в Google-таблице
 * Используется в: salon-grow, private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_client_base_template(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Шаблон базы клиентов</h2>
        
        <p class="lead">
            База клиентов — ваш главный актив. Даже если уйдёте из салона или смените город, 
            контакты останутся с вами. Вот простой шаблон, который работает.
        </p>
        
        <h3>Структура таблицы</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Столбец</th>
                    <th>Что записывать</th>
                    <th>Пример</th>
                </tr>
                <tr>
                    <td>Имя</td>
                    <td>Как обращаться</td>
                    <td>Елена</td>
                </tr>
                <tr>
                    <td>Телефон</td>
                    <td>WhatsApp или Telegram</td>
                    <td>+7 916 123-45-67</td>
                </tr>
                <tr>
                    <td>Дата первого визита</td>
                    <td>Когда пришёл впервые</td>
                    <td>15.01.2026</td>
                </tr>
                <tr>
                    <td>Дата последнего визита</td>
                    <td>Когда был последний раз</td>
                    <td>02.03.2026</td>
                </tr>
                <tr>
                    <td>Всего визитов</td>
                    <td>Сколько раз был</td>
                    <td>4</td>
                </tr>
                <tr>
                    <td>Что беспокоит</td>
                    <td>Основная проблема</td>
                    <td>Боли в пояснице</td>
                </tr>
                <tr>
                    <td>Заметки</td>
                    <td>Важные детали</td>
                    <td>Сидячая работа, IT</td>
                </tr>
                <tr>
                    <td>Следующий контакт</td>
                    <td>Когда написать</td>
                    <td>25.03.2026</td>
                </tr>
            </table>
        </div>
        
        <h3>Где вести</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Google Таблицы (бесплатно)</h4>
                <ul class="simple-list">
                    <li>Доступ с телефона и компьютера</li>
                    <li>Можно сортировать и фильтровать</li>
                    <li>Автоматически сохраняется</li>
                    <li>Можно добавить напоминания</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Заметки в телефоне</h4>
                <ul class="simple-list">
                    <li>Всегда под рукой</li>
                    <li>Быстро записать</li>
                    <li>Но сложно искать</li>
                    <li>Нет структуры</li>
                </ul>
            </div>
        </div>
        
        <h3>Как создать</h3>
        
        <div class="numbered-list">
            <li>Откройте sheets.google.com</li>
            <li>Создайте новую таблицу</li>
            <li>В первой строке напишите названия столбцов (как в таблице выше)</li>
            <li>Закрепите первую строку: Вид — Закрепить — 1 строку</li>
            <li>Добавьте на главный экран телефона для быстрого доступа</li>
        </div>
        
        <div class="tip-box">
            <strong>Совет:</strong> заполняйте базу сразу после сеанса, пока всё помните. 
            Это занимает 1-2 минуты, а через год у вас будет бесценный актив.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_client_base_template };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: client-base-how-to
 * 
 * Как вести базу клиентов: когда заполнять, что важно
 * Используется в: salon-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_client_base_how_to(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как вести базу клиентов</h2>
        
        <p class="lead">
            Недостаточно просто записать контакт. Важно вести базу регулярно 
            и использовать её для возврата клиентов.
        </p>
        
        <h3>Когда заполнять</h3>
        
        <div class="card card-gold">
            <p><strong>Сразу после сеанса</strong> — пока клиент одевается или 
            в первые 5 минут после его ухода. Потом забудете детали.</p>
        </div>
        
        <h3>Что записывать обязательно</h3>
        
        <div class="card card-bordered">
            <ul class="checklist">
                <li><span class="check-box"></span><strong>Имя</strong> — как клиент представился</li>
                <li><span class="check-box"></span><strong>Телефон</strong> — для связи</li>
                <li><span class="check-box"></span><strong>Дата визита</strong> — чтобы знать, когда напомнить</li>
                <li><span class="check-box"></span><strong>Что беспокоит</strong> — основная проблема</li>
            </ul>
        </div>
        
        <h3>Что записывать по желанию (но полезно)</h3>
        
        <div class="card card-bordered">
            <ul class="simple-list">
                <li>Откуда пришёл (Авито, рекомендация, Яндекс.Карты)</li>
                <li>Особенности (не любит разговоры, просит сильнее/мягче)</li>
                <li>Личные детали (работа, дети, увлечения — для поддержания разговора)</li>
                <li>Оплатил сразу или были вопросы по цене</li>
            </ul>
        </div>
        
        <h3>Как использовать базу</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Напоминания о записи</div>
            </div>
            <div class="step-content">
                Раз в неделю просматривайте базу: кто не был 3+ недели? 
                Напишите им напоминание. Это можно автоматизировать, если отмечать 
                дату следующего контакта.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Персонализация</div>
            </div>
            <div class="step-content">
                Перед повторным визитом посмотрите заметки: что обсуждали, 
                что беспокоило. «Как поясница после того курса?» — это показывает заботу.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Анализ</div>
            </div>
            <div class="step-content">
                Раз в месяц посмотрите статистику: сколько новых, сколько вернулись, 
                откуда приходят. Это помогает понять, какие каналы работают.
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Не храните лишнее:</strong> паспортные данные, адреса, 
            медицинские подробности — это нарушает закон о персональных данных 
            и вам не нужно.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_client_base_how_to };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: crm-comparison
 * 
 * Сравнение CRM: YCLIENTS vs Dikidi vs таблица
 * Используется в: private-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_crm_comparison(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Сравнение CRM: что выбрать</h2>
        
        <p class="lead">
            CRM — это система для записи клиентов, напоминаний и ведения базы. 
            Вот три популярных варианта для массажистов.
        </p>
        
        <h3>Сравнительная таблица</h3>
        
        <div class="card card-bordered" style="overflow-x: auto;">
            <table class="data-table">
                <tr>
                    <th>Параметр</th>
                    <th>YCLIENTS</th>
                    <th>Dikidi</th>
                    <th>Google Таблицы</th>
                </tr>
                <tr>
                    <td>Цена</td>
                    <td>от 857 р./мес</td>
                    <td>от 0 р./мес</td>
                    <td>бесплатно</td>
                </tr>
                <tr>
                    <td>Онлайн-запись</td>
                    <td class="highlight">да</td>
                    <td class="highlight">да</td>
                    <td>нет</td>
                </tr>
                <tr>
                    <td>Напоминания клиентам</td>
                    <td class="highlight">авто</td>
                    <td class="highlight">авто</td>
                    <td>вручную</td>
                </tr>
                <tr>
                    <td>История клиента</td>
                    <td class="highlight">да</td>
                    <td class="highlight">да</td>
                    <td>да</td>
                </tr>
                <tr>
                    <td>Финансовый учёт</td>
                    <td class="highlight">да</td>
                    <td>базовый</td>
                    <td>вручную</td>
                </tr>
                <tr>
                    <td>Сложность настройки</td>
                    <td>средняя</td>
                    <td>простая</td>
                    <td>простая</td>
                </tr>
            </table>
        </div>
        
        <h3>Рекомендации</h3>
        
        <div class="card card-green">
            <h4>Dikidi — для старта</h4>
            <p>Бесплатный тариф включает онлайн-запись и базу клиентов. 
            Идеально, если у вас до 50 клиентов в месяц и вы только начинаете.</p>
        </div>
        
        <div class="card card-gold">
            <h4>YCLIENTS — для роста</h4>
            <p>Когда клиентов станет больше 50-70 в месяц, имеет смысл перейти на YCLIENTS. 
            Там лучше автоматизация, финансы и аналитика.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Google Таблицы — если не нужна онлайн-запись</h4>
            <p>Если клиенты записываются через WhatsApp и вам не нужна кнопка 
            «Записаться онлайн» — таблицы достаточно. Но напоминания придётся 
            отправлять вручную.</p>
        </div>
        
        <div class="tip-box">
            <strong>Совет:</strong> начните с Dikidi — это бесплатно и займёт 30 минут. 
            Если через 2-3 месяца поймёте, что нужно больше функций — перейдёте на YCLIENTS.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_crm_comparison };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: crm-setup-guide
 * 
 * Настройка CRM за 1 час: пошаговая инструкция
 * Используется в: private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_crm_setup_guide(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Настройка Dikidi за 1 час</h2>
        
        <p class="lead">
            Dikidi — бесплатная CRM для записи клиентов. Вот пошаговая инструкция, 
            как настроить её с нуля.
        </p>
        
        <div class="week-block">
            <div class="week-title">Шаг 1: Регистрация (5 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Откройте dikidi.net</li>
                    <li>Нажмите «Попробовать бесплатно»</li>
                    <li>Выберите «Индивидуальный мастер»</li>
                    <li>Введите телефон и подтвердите код</li>
                    <li>Придумайте пароль</li>
                </ol>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Шаг 2: Заполните профиль (10 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Добавьте ваше фото — реальное, не логотип</li>
                    <li>Напишите имя и фамилию</li>
                    <li>Укажите специализацию: «Массажист»</li>
                    <li>Добавьте описание: кто вы, какой опыт, с чем работаете</li>
                    <li>Укажите адрес (если принимаете в кабинете) или «Выезд к клиенту»</li>
                </ol>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Шаг 3: Добавьте услуги (15 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Перейдите в раздел «Услуги»</li>
                    <li>Нажмите «Добавить услугу»</li>
                    <li>Название: «Массаж спины и шеи»</li>
                    <li>Длительность: 60 минут</li>
                    <li>Стоимость: ${data.privatePrice || '2500'} р.</li>
                    <li>Повторите для других услуг: общий массаж, антицеллюлитный и т.д.</li>
                </ol>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Шаг 4: Настройте расписание (10 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Перейдите в «Расписание»</li>
                    <li>Укажите рабочие дни</li>
                    <li>Укажите время работы: например, 10:00-20:00</li>
                    <li>Добавьте перерыв, если нужен</li>
                    <li>Система автоматически покажет свободные слоты клиентам</li>
                </ol>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <div class="week-block">
            <div class="week-title">Шаг 5: Включите напоминания (5 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Перейдите в «Настройки» — «Уведомления»</li>
                    <li>Включите SMS или WhatsApp-напоминания клиентам</li>
                    <li>Выберите время: за 24 часа и за 2 часа до визита</li>
                    <li>Это снижает количество неявок на 30-40%</li>
                </ol>
            </div>
        </div>
        
        <div class="week-block">
            <div class="week-title">Шаг 6: Получите ссылку для записи (5 минут)</div>
            <div class="week-content">
                <ol class="numbered-list">
                    <li>Перейдите в «Онлайн-запись»</li>
                    <li>Скопируйте вашу персональную ссылку</li>
                    <li>Добавьте её в профиль Авито, Яндекс.Карт, соцсетей</li>
                    <li>Теперь клиенты могут записаться сами в любое время</li>
                </ol>
            </div>
        </div>
        
        <h3>Что получите в итоге</h3>
        
        <div class="card card-green">
            <ul class="checklist">
                <li><span class="check-box"></span>Клиенты записываются сами через ссылку</li>
                <li><span class="check-box"></span>Автоматические напоминания о визите</li>
                <li><span class="check-box"></span>База клиентов с историей визитов</li>
                <li><span class="check-box"></span>Календарь с расписанием</li>
                <li><span class="check-box"></span>Вы не теряете заявки, пока на сеансе</li>
            </ul>
        </div>
        
        <h3>Частые вопросы</h3>
        
        <div class="card card-bordered">
            <p><strong>Это действительно бесплатно?</strong></p>
            <p style="color: #888;">Да, базовый тариф бесплатный. Есть платные функции, 
            но для одиночного мастера они обычно не нужны.</p>
        </div>
        
        <div class="card card-bordered">
            <p><strong>Клиенты увидят всё моё расписание?</strong></p>
            <p style="color: #888;">Только свободные слоты. Имена других клиентов не видны.</p>
        </div>
        
        <div class="card card-bordered">
            <p><strong>А если клиент не придёт?</strong></p>
            <p style="color: #888;">Напоминания снижают неявки. А если не пришёл — отметьте в системе, 
            это поможет видеть ненадёжных клиентов.</p>
        </div>
        
        <div class="tip-box">
            <strong>Совет:</strong> после настройки добавьте ссылку на запись в подпись WhatsApp 
            и во все объявления. Чем проще клиенту записаться — тем больше записей.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_crm_setup_guide };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: reviews-how-to-ask
 * 
 * Как просить отзывы: когда, какие слова работают
 * Используется в: salon-exit, private-grow, private-optimize
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_reviews_how_to_ask(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как просить отзывы</h2>
        
        <p class="lead">
            Отзывы — это социальное доказательство. 10+ отзывов на Яндекс.Картах 
            поднимают вас в выдаче и увеличивают доверие новых клиентов.
        </p>
        
        <h3>Когда просить</h3>
        
        <div class="card card-gold">
            <p><strong>Лучший момент:</strong> сразу после сеанса, когда клиент доволен 
            и расслаблен. «Как себя чувствуете? Отлично! У меня к вам просьба...»</p>
        </div>
        
        <div class="card card-bordered">
            <p><strong>Второй вариант:</strong> на следующий день, когда пишете 
            узнать о самочувствии. В конце сообщения: «Если понравилось — буду благодарна 
            за отзыв на Яндекс.Картах».
        </div>
        
        <h3>Как просить устно</h3>
        
        <div class="script-box">
            <div class="script-label">Простой вариант</div>
            <div class="script-text">«[Имя], если вам понравилось — оставьте, пожалуйста, отзыв 
на Яндекс.Картах. Это очень помогает мне в продвижении. 
Я сейчас скину ссылку в WhatsApp — там буквально минута.»</div>
        </div>
        
        <div class="script-box">
            <div class="script-label">Если клиент постоянный</div>
            <div class="script-text">«[Имя], вы у меня уже несколько раз были — значит, нравится. 
Не оставите отзыв на Картах? Для меня это важно. 
Напишите как есть — что понравилось, что запомнилось.»</div>
        </div>
        
        <h3>Где публиковать (в порядке важности)</h3>
        
        <div class="numbered-list">
            <li><strong>Яндекс.Карты</strong> — влияет на выдачу в поиске, видят все</li>
            <li><strong>2ГИС</strong> — особенно важно в регионах</li>
            <li><strong>Авито</strong> — повышает доверие к объявлению</li>
            <li><strong>ВКонтакте</strong> — в отзывах группы или на стене</li>
        </div>
        
        <h3>Почему клиенты не оставляют отзывы</h3>
        
        <div class="card card-bordered">
            <ul class="simple-list">
                <li><strong>Забывают</strong> — решение: скидывать ссылку сразу</li>
                <li><strong>Не знают, что написать</strong> — решение: подскажите («напишите, что понравилось, как себя чувствуете»)</li>
                <li><strong>Лень</strong> — решение: максимально упростите (QR-код, прямая ссылка)</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>90% согласятся</strong>, если просить правильно и в нужный момент. 
            Не стесняйтесь — вы не выпрашиваете одолжение, а помогаете клиенту 
            выразить благодарность.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_reviews_how_to_ask };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: reviews-templates
 * 
 * Шаблоны сообщений для просьбы об отзыве + QR-код
 * Используется в: salon-exit, private-grow, private-optimize
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_reviews_templates(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Шаблоны просьбы об отзыве</h2>
        
        <p class="lead">
            Готовые тексты для отправки клиентам. Скопируйте, замените на свою ссылку 
            и отправляйте после каждого сеанса.
        </p>
        
        <h3>Сразу после сеанса</h3>
        
        <div class="template-box">
            <div class="template-title">Короткое сообщение</div>
            <div class="template-content">[Имя], спасибо за визит!

Если понравилось — оставьте, пожалуйста, отзыв. 
Это займёт минуту и очень мне поможет:
[ссылка на Яндекс.Карты]

Буду благодарна!</div>
        </div>
        
        <h3>На следующий день (с вопросом о самочувствии)</h3>
        
        <div class="template-box">
            <div class="template-title">Сообщение с заботой</div>
            <div class="template-content">[Имя], добрый день!

Как самочувствие после вчерашнего массажа? 
Если всё хорошо — буду рада отзыву:
[ссылка]

Напишите как есть — что понравилось, 
как себя чувствуете. Это очень поможет!</div>
        </div>
        
        <h3>Для постоянных клиентов</h3>
        
        <div class="template-box">
            <div class="template-title">Личная просьба</div>
            <div class="template-content">[Имя], у меня к вам личная просьба.

Вы у меня уже давно — значит, нравится результат. 
Не оставите отзыв на Яндекс.Картах? 
Для меня это важно для продвижения.

Вот ссылка: [ссылка]

Заранее спасибо!</div>
        </div>
        
        <h3>Как сделать QR-код</h3>
        
        <div class="card card-bordered">
            <ol class="numbered-list">
                <li>Скопируйте ссылку на вашу карточку в Яндекс.Картах</li>
                <li>Откройте любой генератор QR-кодов (например, qr-code-generator.com)</li>
                <li>Вставьте ссылку, скачайте QR-код</li>
                <li>Распечатайте и поставьте на видное место в кабинете</li>
            </ol>
        </div>
        
        <div class="tip-box">
            <strong>Подпись под QR-кодом:</strong> «Понравилось? Оставьте отзыв — 
            наведите камеру на код». Клиенты сканируют, пока одеваются.
        </div>
        
        <h3>Сколько отзывов нужно</h3>
        
        <div class="compare-row">
            <div class="compare-box">
                <div class="compare-label">Минимум</div>
                <div class="compare-value" style="color: #f4a574;">5</div>
                <div class="compare-sub">чтобы появиться в выдаче</div>
            </div>
            <div class="compare-box">
                <div class="compare-label">Норма</div>
                <div class="compare-value" style="color: #d4a574;">10-15</div>
                <div class="compare-sub">выглядит надёжно</div>
            </div>
            <div class="compare-box">
                <div class="compare-label">Отлично</div>
                <div class="compare-value" style="color: #7ec8a3;">20+</div>
                <div class="compare-sub">конкурентное преимущество</div>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_reviews_templates };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: place-comparison
 * 
 * Сравнение вариантов: дом vs аренда vs выезд
 * Используется в: salon-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_place_comparison(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Где принимать: сравнение вариантов</h2>
        
        <p class="lead">
            Выбор места — одно из первых решений при переходе на частную практику. 
            У каждого варианта свои плюсы и минусы.
        </p>
        
        <div class="card card-bordered" style="overflow-x: auto;">
            <table class="data-table">
                <tr>
                    <th>Параметр</th>
                    <th>Дома</th>
                    <th>Аренда кабинета</th>
                    <th>Выезд к клиенту</th>
                </tr>
                <tr>
                    <td>Расходы</td>
                    <td class="highlight">~15% от дохода</td>
                    <td>~30% от дохода</td>
                    <td class="highlight">~10%</td>
                </tr>
                <tr>
                    <td>Старт</td>
                    <td class="highlight">Сразу</td>
                    <td>Нужно найти место</td>
                    <td class="highlight">Сразу</td>
                </tr>
                <tr>
                    <td>Удобство для вас</td>
                    <td class="highlight">Максимум</td>
                    <td>Нужно ездить</td>
                    <td>Дорога к клиенту</td>
                </tr>
                <tr>
                    <td>Статус в глазах клиента</td>
                    <td>Средний</td>
                    <td class="highlight">Высокий</td>
                    <td>Средний</td>
                </tr>
                <tr>
                    <td>Кому подходит</td>
                    <td>Есть отдельная комната</td>
                    <td>Готовы вложить</td>
                    <td>На старте</td>
                </tr>
            </table>
        </div>
        
        <h3>Дома</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Плюсы</h4>
                <ul class="simple-list">
                    <li>Нет аренды</li>
                    <li>Никуда не надо ездить</li>
                    <li>Гибкий график</li>
                    <li>Можно начать сразу</li>
                </ul>
            </div>
            <div class="card" style="border: 1px solid #f4a574;">
                <h4>Минусы</h4>
                <ul class="simple-list">
                    <li>Нужна отдельная комната</li>
                    <li>Семья может мешать</li>
                    <li>Не все клиенты хотят ехать домой</li>
                </ul>
            </div>
        </div>
        
        <h3>Аренда кабинета</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Плюсы</h4>
                <ul class="simple-list">
                    <li>Профессиональный вид</li>
                    <li>Клиенты охотнее едут</li>
                    <li>Нет домашних отвлекающих</li>
                </ul>
            </div>
            <div class="card" style="border: 1px solid #f4a574;">
                <h4>Минусы</h4>
                <ul class="simple-list">
                    <li>Расходы 15-25 тыс. р./мес</li>
                    <li>Нужно ездить на работу</li>
                    <li>Обязательства по договору</li>
                </ul>
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Рекомендация:</strong> начните с выезда или дома — минимум вложений. 
            Когда стабильно будет 10+ клиентов в неделю — можно думать об аренде.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_place_comparison };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: place-checklist
 * 
 * Чек-лист для выбора места приёма
 * Используется в: salon-exit
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_place_checklist(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Чек-лист: что нужно для каждого варианта</h2>
        
        <p class="lead">
            Проверьте, готовы ли вы к выбранному формату работы.
        </p>
        
        <div class="card card-bordered">
            <h4>Если принимаете дома</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть отдельная комната (не проходная)</li>
                <li><span class="check-box"></span>Семья согласна и не будет мешать</li>
                <li><span class="check-box"></span>Можно сделать отдельный вход или изолировать зону</li>
                <li><span class="check-box"></span>Чисто, уютно, не пахнет едой</li>
                <li><span class="check-box"></span>Есть место для переодевания клиента</li>
                <li><span class="check-box"></span>Соседи не будут жаловаться на поток людей</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Если арендуете кабинет</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Бюджет на первые 2-3 месяца аренды</li>
                <li><span class="check-box"></span>Нашли подходящее место (салон, мед. центр, коворкинг)</li>
                <li><span class="check-box"></span>Удобная транспортная доступность для клиентов</li>
                <li><span class="check-box"></span>Есть оборудование или оно входит в аренду</li>
                <li><span class="check-box"></span>Понятные условия договора</li>
                <li><span class="check-box"></span>Можно использовать своё бельё и расходники</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Если работаете с выездом</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть складной массажный стол</li>
                <li><span class="check-box"></span>Есть машина или готовы на такси/общ. транспорт</li>
                <li><span class="check-box"></span>Сумка для белья и расходников</li>
                <li><span class="check-box"></span>Понимаете, что дорога отнимает время</li>
                <li><span class="check-box"></span>Определили зону выезда (районы, расстояние)</li>
                <li><span class="check-box"></span>Решили вопрос с наценкой за выезд</li>
            </ul>
        </div>
        
        <h3>Оборудование для старта</h3>
        
        <div class="card card-gold">
            <ul class="simple-list">
                <li><strong>Массажный стол</strong> — от 8 000 р. (складной), от 15 000 р. (стационарный)</li>
                <li><strong>Одноразовые простыни</strong> — от 500 р./100 шт</li>
                <li><strong>Масло</strong> — от 300 р./литр</li>
                <li><strong>Полотенца</strong> — от 200 р./шт</li>
                <li><strong>Валики, подушки</strong> — от 500 р.</li>
            </ul>
            <p style="margin-top: 12px; color: #888;">
                Минимальный набор: 15-20 тыс. р. Этого достаточно для начала.
            </p>
        </div>
        
        <div class="tip-box">
            <strong>Совет:</strong> не покупайте дорогое оборудование сразу. 
            Начните с базового, а улучшите, когда появится стабильный доход.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_place_checklist };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: grow-private-strategy
 * 
 * Стратегия роста частной практики при гибриде
 * Используется в: hybrid-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_grow_private_strategy(data, pageNum, totalPages) {
    
    const perClientPrivate = data.perClientPrivate || 2500;
    const perClientSalon = data.perClientSalon || 1000;
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Стратегия роста частной практики</h2>
        
        <p class="lead">
            У вас гибрид: салон + частная практика. Это отличная позиция — 
            салон даёт стабильность, частная — рост дохода. 
            Задача: постепенно увеличивать долю частной.
        </p>
        
        <h3>Почему частные клиенты выгоднее</h3>
        
        <div class="compare-row">
            <div class="compare-box" style="border: 1px solid #d4a574;">
                <div class="compare-label">Клиент в салоне</div>
                <div class="compare-value" style="color: #d4a574;">${perClientSalon} р.</div>
                <div class="compare-sub">вам остаётся</div>
            </div>
            <div class="compare-box" style="border: 1px solid #7ec8a3;">
                <div class="compare-label">Частный клиент</div>
                <div class="compare-value" style="color: #7ec8a3;">${perClientPrivate} р.</div>
                <div class="compare-sub">вам остаётся</div>
            </div>
        </div>
        
        <p style="text-align: center; color: #888; margin-bottom: 24px;">
            Каждый частный клиент приносит в ${Math.round(perClientPrivate / perClientSalon * 10) / 10} раза больше
        </p>
        
        <h3>План роста</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Определите время для частной практики</div>
            </div>
            <div class="step-content">
                Вечера после салона? Выходные? Один свободный день в неделю? 
                Выделите конкретные часы и защитите их — это ваше время для роста.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Усильте каналы привлечения</div>
            </div>
            <div class="step-content">
                Авито, Яндекс.Карты, соцсети — всё должно работать на вашу частную практику. 
                Обновляйте объявления, добавляйте отзывы, публикуйте контент.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Удерживайте частных клиентов</div>
            </div>
            <div class="step-content">
                Каждый частный клиент — на вес золота. Напоминайте о записи, 
                заботьтесь между визитами. Цель — чтобы они возвращались именно к вам.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">Постепенно смещайте баланс</div>
            </div>
            <div class="step-content">
                +1-2 частных клиента в неделю каждый месяц. Через полгода частная практика 
                может давать больше дохода, чем салон.
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Важно:</strong> не переносите клиентов из салона в частную практику. 
            Это неэтично и рискованно. Стройте частную базу с нуля — через свои каналы.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_grow_private_strategy };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: grow-private-schedule
 * 
 * Как выделить время на частных клиентов при работе в салоне
 * Используется в: hybrid-grow
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_grow_private_schedule(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Расписание для роста частной практики</h2>
        
        <p class="lead">
            Главная проблема гибрида — найти время на частных клиентов, 
            когда салон забирает основные часы. Вот как организовать расписание.
        </p>
        
        <h3>Три модели расписания</h3>
        
        <div class="card card-gold">
            <h4>Модель 1: Вечера</h4>
            <p>Работаете в салоне до 18-19, частных принимаете с 19 до 21-22.</p>
            <ul class="simple-list">
                <li>Подходит, если принимаете дома или близко к дому</li>
                <li>2-3 частных клиента в день реально</li>
                <li>Минус: усталость, мало личного времени</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Модель 2: Выходные</h4>
            <p>Салон в будни, частная практика в субботу-воскресенье.</p>
            <ul class="simple-list">
                <li>Можно принять 5-8 клиентов за выходные</li>
                <li>Подходит, если в салоне полная занятость</li>
                <li>Минус: нет выходных, риск выгорания</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Модель 3: Свободный день</h4>
            <p>Договориться в салоне на 4-дневную неделю, один день — частная практика.</p>
            <ul class="simple-list">
                <li>Самый комфортный вариант</li>
                <li>Можно принять 4-6 клиентов за день</li>
                <li>Минус: потеряете часть дохода в салоне</li>
            </ul>
        </div>
        
        <h3>Как выбрать</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Ситуация</th>
                    <th>Рекомендация</th>
                </tr>
                <tr>
                    <td>Принимаете дома, живёте близко к салону</td>
                    <td class="highlight">Вечера</td>
                </tr>
                <tr>
                    <td>Есть дети, важны вечера</td>
                    <td class="highlight">Выходные</td>
                </tr>
                <tr>
                    <td>В салоне не полная загрузка</td>
                    <td class="highlight">Свободный день</td>
                </tr>
                <tr>
                    <td>Хотите быстрый рост</td>
                    <td class="highlight">Вечера + выходные</td>
                </tr>
            </table>
        </div>
        
        <h3>Пример расписания</h3>
        
        <div class="week-block">
            <div class="week-title">Неделя</div>
            <div class="week-content">
                <p><strong>Пн-Пт:</strong> салон 10:00-18:00, частные 19:00-21:00 (2 клиента)</p>
                <p><strong>Сб:</strong> частная практика 10:00-18:00 (4 клиента)</p>
                <p><strong>Вс:</strong> выходной</p>
                <p style="margin-top: 12px; color: #7ec8a3;">
                    <strong>Итого:</strong> 10-14 частных клиентов в неделю
                </p>
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Начните с малого:</strong> сначала 2-3 частных клиента в неделю. 
            Когда отладите процесс и появится поток — добавите часы.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_grow_private_schedule };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-teach-formats
 * 
 * Форматы обучения: что выбрать для старта
 * Используется в: private-grow (при scalingInterest === 'teach')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_teach_formats(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Масштабирование через обучение</h2>
        
        <p class="lead">
            Вы хотите делиться опытом — это отличный путь роста. 
            Обучение может приносить доход без увеличения количества массажей.
        </p>
        
        <h3>Форматы обучения</h3>
        
        <div class="card card-gold">
            <h4>Мастер-классы (офлайн)</h4>
            <ul class="simple-list">
                <li>Длительность: 3-8 часов</li>
                <li>Группа: 4-10 человек</li>
                <li>Цена: 3 000 - 10 000 р./чел</li>
                <li>Ваш доход: 12 000 - 100 000 р. за день</li>
            </ul>
            <p style="color: #888; margin-top: 8px;">
                Подходит для практических техник, которые нужно показать вживую.
            </p>
        </div>
        
        <div class="card card-bordered">
            <h4>Индивидуальное менторство</h4>
            <ul class="simple-list">
                <li>Формат: 1-на-1 или мини-группа</li>
                <li>Длительность: 1-3 месяца</li>
                <li>Цена: 15 000 - 50 000 р./чел</li>
                <li>Включает: разбор техники, помощь с продвижением</li>
            </ul>
            <p style="color: #888; margin-top: 8px;">
                Самый дорогой формат, но требует много времени.
            </p>
        </div>
        
        <div class="card card-bordered">
            <h4>Онлайн-курс</h4>
            <ul class="simple-list">
                <li>Формат: записанные видео + задания</li>
                <li>Цена: 5 000 - 20 000 р.</li>
                <li>Масштаб: неограничен</li>
                <li>Доход: пассивный после создания</li>
            </ul>
            <p style="color: #888; margin-top: 8px;">
                Требует вложений в создание, но потом продаётся без вашего участия.
            </p>
        </div>
        
        <div class="card card-bordered">
            <h4>Гайды и PDF-продукты</h4>
            <ul class="simple-list">
                <li>Формат: электронная книга, чек-лист, шаблоны</li>
                <li>Цена: 500 - 3 000 р.</li>
                <li>Создание: 1-3 дня</li>
                <li>Масштаб: неограничен</li>
            </ul>
            <p style="color: #888; margin-top: 8px;">
                Самый простой старт — можно сделать за выходные.
            </p>
        </div>
        
        <h3>С чего начать</h3>
        
        <div class="tip-box">
            <strong>Рекомендация:</strong> начните с мастер-класса или гайда. 
            Это покажет, есть ли спрос, и даст опыт. Потом можно расширять.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_teach_formats };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-teach-pricing
 * 
 * Ценообразование обучения
 * Используется в: private-grow (при scalingInterest === 'teach')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_teach_pricing(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Сколько брать за обучение</h2>
        
        <p class="lead">
            Ценообразование в обучении — не про «сколько стоит моё время», 
            а про «какую ценность получит ученик».
        </p>
        
        <h3>Ориентиры по рынку (2026)</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Формат</th>
                    <th>Диапазон цен</th>
                    <th>Средняя цена</th>
                </tr>
                <tr>
                    <td>Мастер-класс 4-6 часов</td>
                    <td>3 000 - 8 000 р.</td>
                    <td>5 000 р.</td>
                </tr>
                <tr>
                    <td>Мастер-класс полный день</td>
                    <td>6 000 - 15 000 р.</td>
                    <td>10 000 р.</td>
                </tr>
                <tr>
                    <td>Индивидуальное занятие</td>
                    <td>3 000 - 7 000 р./час</td>
                    <td>5 000 р./час</td>
                </tr>
                <tr>
                    <td>Менторство (месяц)</td>
                    <td>15 000 - 50 000 р.</td>
                    <td>25 000 р.</td>
                </tr>
                <tr>
                    <td>Онлайн-курс</td>
                    <td>5 000 - 30 000 р.</td>
                    <td>12 000 р.</td>
                </tr>
                <tr>
                    <td>PDF-гайд</td>
                    <td>500 - 3 000 р.</td>
                    <td>1 500 р.</td>
                </tr>
            </table>
        </div>
        
        <h3>Как определить свою цену</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Посмотрите конкурентов</div>
            </div>
            <div class="step-content">
                Найдите 3-5 массажистов, которые проводят похожее обучение. 
                Посмотрите их цены. Ваша первая цена — в середине диапазона или чуть ниже.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Оцените результат для ученика</div>
            </div>
            <div class="step-content">
                Если после обучения ученик сможет брать за массаж на 500 р. больше — 
                обучение за 5 000 р. окупится за 10 клиентов. Это хорошая сделка.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Начните ниже, поднимайте</div>
            </div>
            <div class="step-content">
                Первый мастер-класс можно провести дешевле — чтобы набрать отзывы. 
                После 2-3 успешных — поднимайте цену.
            </div>
        </div>
        
        <div class="warning-box">
            <strong>Не занижайте слишком сильно.</strong> Цена 1 000 р. за мастер-класс 
            выглядит подозрительно: «наверное, ничего ценного». 
            Адекватная цена повышает воспринимаемую ценность.
        </div>
        
        <div class="tip-box">
            <strong>Формула:</strong> ваша часовая ставка × количество часов × 2-3. 
            Множитель 2-3 — за подготовку и экспертизу.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_teach_pricing };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-teach-first-students
 * 
 * Где найти первых учеников
 * Используется в: private-grow (при scalingInterest === 'teach')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_teach_first_students(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как найти первых учеников</h2>
        
        <p class="lead">
            Самое сложное — начать. Когда нет отзывов и кейсов, 
            сложно продать обучение. Вот как набрать первую группу.
        </p>
        
        <h3>Где искать</h3>
        
        <div class="card card-gold">
            <h4>Ваши клиенты</h4>
            <p>Среди ваших клиентов наверняка есть те, кто интересуется массажем 
            или хочет научиться делать базовые техники для семьи. 
            Спросите: «Не хотите научиться делать массаж мужу/жене?»</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Коллеги-массажисты</h4>
            <p>Массажисты с меньшим опытом ищут, у кого учиться. 
            Разместите пост в профессиональных группах ВК или Telegram-чатах.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Соцсети</h4>
            <p>Напишите пост: «Планирую провести мастер-класс по [тема]. 
            Кому интересно?» — соберёте первых желающих без вложений в рекламу.</p>
        </div>
        
        <div class="card card-bordered">
            <h4>Специализированные площадки</h4>
            <p>Разместите анонс на обучающих порталах: 
            профи.ру, курсы-массажа.рф, в городских афишах.</p>
        </div>
        
        <h3>Как продать первый мастер-класс</h3>
        
        <div class="numbered-list">
            <li><strong>Определите узкую тему</strong> — не «массаж», а «массаж шейно-воротниковой зоны 
            при сидячей работе»</li>
            <li><strong>Напишите, какой результат получит ученик</strong> — «после МК сможете 
            снимать напряжение себе и близким за 15 минут»</li>
            <li><strong>Дайте раннюю цену</strong> — «при записи до [дата] — скидка 20%»</li>
            <li><strong>Ограничьте количество мест</strong> — «группа 6 человек» — создаёт срочность</li>
            <li><strong>Попросите предоплату</strong> — 50% при записи, 50% на МК</li>
        </div>
        
        <h3>Первый мастер-класс — за отзывы</h3>
        
        <div class="tip-box">
            <strong>Лайфхак:</strong> проведите первый МК для 3-4 человек по символической цене 
            или бесплатно, взамен на отзывы и фото. Эти материалы помогут продавать следующие.
        </div>
        
        <div class="warning-box">
            <strong>Не ждите, пока будет «идеально».</strong> Начните с того, что умеете лучше всего. 
            Улучшите программу после первого потока на основе обратной связи.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_teach_first_students };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-own-space-economics
 * 
 * Экономика своего пространства: расчёт окупаемости
 * Используется в: private-grow (при scalingInterest === 'space')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_own_space_economics(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Экономика своего пространства</h2>
        
        <p class="lead">
            Своё место — это шаг к масштабированию. Но прежде чем арендовать 
            или покупать, нужно посчитать экономику.
        </p>
        
        <h3>Типичные расходы на кабинет</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Статья расходов</th>
                    <th>Москва/СПб</th>
                    <th>Регионы</th>
                </tr>
                <tr>
                    <td>Аренда кабинета 15-20 м2</td>
                    <td>25 000 - 50 000 р.</td>
                    <td>10 000 - 25 000 р.</td>
                </tr>
                <tr>
                    <td>Коммунальные</td>
                    <td>2 000 - 5 000 р.</td>
                    <td>1 500 - 3 000 р.</td>
                </tr>
                <tr>
                    <td>Расходники (масло, бельё)</td>
                    <td>3 000 - 5 000 р.</td>
                    <td>2 000 - 4 000 р.</td>
                </tr>
                <tr>
                    <td>Интернет, телефон</td>
                    <td>1 000 - 2 000 р.</td>
                    <td>500 - 1 000 р.</td>
                </tr>
                <tr>
                    <td><strong>Итого в месяц</strong></td>
                    <td><strong>31 000 - 62 000 р.</strong></td>
                    <td><strong>14 000 - 33 000 р.</strong></td>
                </tr>
            </table>
        </div>
        
        <h3>Расчёт точки безубыточности</h3>
        
        <div class="card card-gold">
            <p style="font-family: monospace; color: #d4a574; margin-bottom: 12px;">
                Минимум клиентов = Расходы / Чистая прибыль с клиента
            </p>
            <p>Пример: расходы 30 000 р., чек 3 000 р., чистая прибыль 2 500 р.</p>
            <p style="color: #7ec8a3; margin-top: 8px;">
                30 000 / 2 500 = <strong>12 клиентов в месяц</strong> для выхода в ноль
            </p>
        </div>
        
        <h3>Когда имеет смысл</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Стоит открывать</h4>
                <ul class="simple-list">
                    <li>У вас уже 40+ клиентов в месяц</li>
                    <li>Загрузка 70%+, нет свободных слотов</li>
                    <li>Есть подушка на 3 месяца расходов</li>
                    <li>Хотите нанять помощника</li>
                </ul>
            </div>
            <div class="card" style="border: 1px solid #f4a574;">
                <h4>Рано открывать</h4>
                <ul class="simple-list">
                    <li>Меньше 30 клиентов в месяц</li>
                    <li>Есть свободные слоты</li>
                    <li>Нет финансовой подушки</li>
                    <li>Работаете дома и всё устраивает</li>
                </ul>
            </div>
        </div>
        
        <div class="tip-box">
            <strong>Альтернатива:</strong> почасовая аренда кабинета в салоне или мед. центре. 
            Платите только за часы работы — меньше риска на старте.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_own_space_economics };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-own-space-checklist
 * 
 * Чек-лист открытия своего кабинета/студии
 * Используется в: private-grow (при scalingInterest === 'space')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_own_space_checklist(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Чек-лист открытия своего места</h2>
        
        <p class="lead">
            Прежде чем подписывать договор аренды, проверьте все пункты.
        </p>
        
        <div class="card card-bordered">
            <h4>Финансовая готовность</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Есть деньги на депозит + первый месяц аренды</li>
                <li><span class="check-box"></span>Есть подушка на 3 месяца расходов</li>
                <li><span class="check-box"></span>Посчитали точку безубыточности</li>
                <li><span class="check-box"></span>Текущий поток клиентов покрывает расходы</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Помещение</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Площадь минимум 15-20 м2</li>
                <li><span class="check-box"></span>Удобный подъезд для клиентов</li>
                <li><span class="check-box"></span>Есть вода (раковина)</li>
                <li><span class="check-box"></span>Нормальная вентиляция</li>
                <li><span class="check-box"></span>Можно сделать отдельный вход или зону ожидания</li>
                <li><span class="check-box"></span>Разрешено оказывать услуги массажа</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Оборудование</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>Массажный стол (или есть бюджет на покупку)</li>
                <li><span class="check-box"></span>Шкаф для белья и расходников</li>
                <li><span class="check-box"></span>Место для переодевания клиента</li>
                <li><span class="check-box"></span>Зеркало, вешалка для одежды</li>
                <li><span class="check-box"></span>Чайник, вода, стаканы для клиентов</li>
            </ul>
        </div>
        
        <div class="card card-bordered">
            <h4>Документы</h4>
            <ul class="checklist">
                <li><span class="check-box"></span>ИП или самозанятость оформлены</li>
                <li><span class="check-box"></span>Договор аренды прочитан и понятен</li>
                <li><span class="check-box"></span>Знаете условия расторжения</li>
                <li><span class="check-box"></span>Есть медицинская книжка (если требуется)</li>
            </ul>
        </div>
        
        <h3>Бюджет на старт</h3>
        
        <div class="card card-gold">
            <ul class="simple-list">
                <li>Депозит: 1-2 месяца аренды</li>
                <li>Первый месяц аренды</li>
                <li>Оборудование: 30 000 - 80 000 р.</li>
                <li>Расходники на первый месяц: 5 000 р.</li>
                <li>Подушка: 3 месяца расходов</li>
            </ul>
            <p style="margin-top: 12px; color: #888;">
                <strong>Итого на старт:</strong> 100 000 - 300 000 р. в зависимости от города и помещения
            </p>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_own_space_checklist };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-hire-assistant
 * 
 * Найм помощника-массажиста
 * Используется в: private-grow (при scalingInterest === 'space' и есть своё место)
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_hire_assistant(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Найм помощника-массажиста</h2>
        
        <p class="lead">
            Если вы загружены на 100% и отказываете клиентам — пора думать о помощнике. 
            Это первый шаг от частной практики к студии.
        </p>
        
        <h3>Когда нанимать</h3>
        
        <div class="card card-gold">
            <ul class="checklist">
                <li><span class="check-box"></span>Вы отказываете 3-5 клиентам в неделю из-за загрузки</li>
                <li><span class="check-box"></span>У вас есть своё место (или аренда позволяет второго мастера)</li>
                <li><span class="check-box"></span>Есть деньги на первые 2 месяца оплаты помощника</li>
                <li><span class="check-box"></span>Готовы передать часть клиентов другому</li>
            </ul>
        </div>
        
        <h3>Кого искать</h3>
        
        <div class="two-cols">
            <div class="card card-bordered">
                <h4>Начинающий (стажёр)</h4>
                <ul class="simple-list">
                    <li>Опыт 0-1 год</li>
                    <li>Оплата: 30-40% от сеанса</li>
                    <li>Нужно обучать и контролировать</li>
                    <li>Лоялен, готов учиться</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Опытный</h4>
                <ul class="simple-list">
                    <li>Опыт 2-5 лет</li>
                    <li>Оплата: 40-50% от сеанса</li>
                    <li>Работает самостоятельно</li>
                    <li>Может уйти к конкурентам</li>
                </ul>
            </div>
        </div>
        
        <h3>Модели оплаты</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Модель</th>
                    <th>Как работает</th>
                    <th>Кому подходит</th>
                </tr>
                <tr>
                    <td>% от сеанса</td>
                    <td>Мастер получает 40-50% от каждого клиента</td>
                    <td>Когда мало клиентов на старте</td>
                </tr>
                <tr>
                    <td>Фикс + %</td>
                    <td>Минимум 20-30 тыс. + % сверх плана</td>
                    <td>Когда стабильный поток</td>
                </tr>
                <tr>
                    <td>Аренда места</td>
                    <td>Мастер платит за час/день использования</td>
                    <td>Когда не хотите управлять</td>
                </tr>
            </table>
        </div>
        
        <h3>Где искать</h3>
        
        <div class="numbered-list">
            <li>Профессиональные чаты массажистов в Telegram</li>
            <li>Группы ВКонтакте для массажистов</li>
            <li>Объявление на Авито в разделе «Вакансии»</li>
            <li>Среди выпускников массажных курсов</li>
            <li>Рекомендации от коллег</li>
        </div>
        
        <div class="warning-box">
            <strong>Главный риск:</strong> помощник может увести ваших клиентов. 
            Решение: оформите договор с пунктом о неконкуренции и работайте 
            с теми, кто ценит стабильность больше, чем риск.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_hire_assistant };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-subrent
 * 
 * Субаренда: как сдавать место в свободные часы
 * Используется в: private-grow (при scalingInterest === 'space')
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_subrent(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Субаренда: доход со свободных часов</h2>
        
        <p class="lead">
            Если у вас есть кабинет, который простаивает в какие-то часы — 
            можно сдавать его другим мастерам. Это пассивный доход без дополнительной работы.
        </p>
        
        <h3>Как это работает</h3>
        
        <div class="card card-gold">
            <p>Вы работаете с 10 до 18. Вечером кабинет пустует.</p>
            <p style="margin-top: 8px;">Сдаёте его другому массажисту с 18 до 22 — 
            он платит вам за аренду.</p>
            <p style="color: #7ec8a3; margin-top: 8px;">
                <strong>Ваш доход:</strong> 300-500 р./час × 4 часа × 20 дней = 
                24 000 - 40 000 р./мес
            </p>
        </div>
        
        <h3>Сколько брать</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Город</th>
                    <th>Час</th>
                    <th>День (8 часов)</th>
                </tr>
                <tr>
                    <td>Москва</td>
                    <td>400 - 700 р.</td>
                    <td>2 500 - 4 000 р.</td>
                </tr>
                <tr>
                    <td>СПб</td>
                    <td>300 - 500 р.</td>
                    <td>2 000 - 3 500 р.</td>
                </tr>
                <tr>
                    <td>Города-миллионники</td>
                    <td>200 - 400 р.</td>
                    <td>1 500 - 2 500 р.</td>
                </tr>
                <tr>
                    <td>Остальные</td>
                    <td>150 - 300 р.</td>
                    <td>1 000 - 2 000 р.</td>
                </tr>
            </table>
        </div>
        
        <h3>Кому сдавать</h3>
        
        <div class="two-cols">
            <div class="card card-green">
                <h4>Хорошие арендаторы</h4>
                <ul class="simple-list">
                    <li>Массажисты (понимают специфику)</li>
                    <li>Косметологи (если есть раковина)</li>
                    <li>Мастера маникюра</li>
                    <li>Психологи, коучи</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>На что смотреть</h4>
                <ul class="simple-list">
                    <li>Есть опыт работы</li>
                    <li>Аккуратность</li>
                    <li>Своя клиентская база</li>
                    <li>Готовность к предоплате</li>
                </ul>
            </div>
        </div>
        
        <h3>Важные правила</h3>
        
        <div class="warning-box">
            <ul class="simple-list">
                <li><strong>Проверьте договор аренды</strong> — разрешена ли субаренда</li>
                <li><strong>Заключите договор</strong> — даже простой, на бумаге</li>
                <li><strong>Берите предоплату</strong> — минимум за неделю вперёд</li>
                <li><strong>Установите правила</strong> — уборка, расходники, что можно/нельзя</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Где искать арендаторов:</strong> профессиональные чаты, 
            объявление на Авито «Сдам кабинет массажиста почасово», 
            сарафанное радио среди коллег.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_subrent };
}
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scaling-team-economics
 * 
 * Экономика команды: расчёт дохода при найме
 * Используется в: private-grow (при scalingInterest === 'space' и есть место)
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scaling_team_economics(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Экономика команды</h2>
        
        <p class="lead">
            Когда вы нанимаете мастера, ваш доход растёт без увеличения личной нагрузки. 
            Вот как посчитать, сколько вы заработаете.
        </p>
        
        <h3>Базовый расчёт</h3>
        
        <div class="card card-bordered">
            <p><strong>Исходные данные:</strong></p>
            <ul class="simple-list">
                <li>Чек за сеанс: 3 000 р.</li>
                <li>Мастер получает: 45% = 1 350 р.</li>
                <li>Расходники: 5% = 150 р.</li>
                <li>Вам остаётся: 50% = 1 500 р.</li>
            </ul>
        </div>
        
        <div class="card card-gold">
            <p><strong>При 30 клиентах в месяц на одного мастера:</strong></p>
            <p style="font-size: 18px; color: #7ec8a3; margin-top: 12px;">
                30 × 1 500 = <strong>45 000 р.</strong> — ваш доход с одного мастера
            </p>
            <p style="color: #888; margin-top: 8px;">
                При этом вы не делаете эти массажи сами
            </p>
        </div>
        
        <h3>Расчёт для двух мастеров</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Показатель</th>
                    <th>1 мастер</th>
                    <th>2 мастера</th>
                </tr>
                <tr>
                    <td>Клиентов в месяц</td>
                    <td>30</td>
                    <td>60</td>
                </tr>
                <tr>
                    <td>Выручка</td>
                    <td>90 000 р.</td>
                    <td>180 000 р.</td>
                </tr>
                <tr>
                    <td>Мастерам (45%)</td>
                    <td>40 500 р.</td>
                    <td>81 000 р.</td>
                </tr>
                <tr>
                    <td>Расходники (5%)</td>
                    <td>4 500 р.</td>
                    <td>9 000 р.</td>
                </tr>
                <tr>
                    <td>Аренда (фикс)</td>
                    <td>30 000 р.</td>
                    <td>30 000 р.</td>
                </tr>
                <tr>
                    <td><strong>Ваша прибыль</strong></td>
                    <td><strong>15 000 р.</strong></td>
                    <td class="highlight"><strong>60 000 р.</strong></td>
                </tr>
            </table>
        </div>
        
        <h3>Ключевые выводы</h3>
        
        <div class="numbered-list">
            <li><strong>Один мастер</strong> — может не окупить аренду, если клиентов мало</li>
            <li><strong>Два мастера</strong> — экономика улучшается, аренда размазывается</li>
            <li><strong>Ваша работа + команда</strong> — оптимальный вариант на старте</li>
        </div>
        
        <div class="tip-box">
            <strong>Рекомендация:</strong> сначала работайте сами и добавьте одного помощника. 
            Когда отладите процессы — можно масштабировать дальше.
        </div>
        
        <div class="warning-box">
            <strong>Не забудьте:</strong> это упрощённый расчёт. Добавьте налоги (6-15%), 
            маркетинг, непредвиденные расходы. Реальная прибыль будет на 20-30% меньше.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { block_scaling_team_economics };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: plan-30-days
 * 
 * ПЛАН НА 30 ДНЕЙ ПО НЕДЕЛЯМ — критически важный блок для private
 * Используется в: private-grow, private-optimize
 * Страниц: 3
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_plan_30_days(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>План на 30 дней: от хаоса к системе</h2>
        
        <p class="lead">
            Этот план — пошаговая инструкция на месяц. Каждая неделя имеет чёткую цель. 
            Выполняйте задачи по порядку — и через 30 дней у вас будет работающая система 
            привлечения клиентов.
        </p>
        
        <div class="card card-gold">
            <h3 style="margin-top: 0;">Неделя 1: Фундамент</h3>
            <p><strong>Цель:</strong> настроить все каналы привлечения</p>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пн</div>
                    <div class="step-title">Авито</div>
                </div>
                <div class="step-content">
                    Создайте объявление по шаблону из раздела «Авито». 
                    Загрузите 5-7 фото (кабинет, вы за работой, сертификаты). 
                    Укажите цену, район, время работы. Опубликуйте.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Вт</div>
                    <div class="step-title">Яндекс.Карты и 2ГИС</div>
                </div>
                <div class="step-content">
                    Зарегистрируйте точку на Яндекс.Картах (business.yandex.ru). 
                    Заполните все поля: услуги, цены, фото, время работы.
                    Сделайте то же самое на 2ГИС (business.2gis.ru).
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Ср</div>
                    <div class="step-title">Telegram-канал</div>
                </div>
                <div class="step-content">
                    Создайте канал: «Имя | Массажист ${data.cityName}». 
                    Напишите закреплённый пост-знакомство. Добавьте ссылку на запись.
                    Пригласите друзей и родственников.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Чт</div>
                    <div class="step-title">ВКонтакте</div>
                </div>
                <div class="step-content">
                    Оформите личную страницу как рабочую: имя + специализация, 
                    профессиональное фото, информация об услугах.
                    Или создайте паблик, если хотите разделять личное и рабочее.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пт</div>
                    <div class="step-title">Онлайн-запись</div>
                </div>
                <div class="step-content">
                    Зарегистрируйтесь в YCLIENTS или Dikidi (бесплатный тариф). 
                    Добавьте 3-5 основных услуг с ценами. Настройте расписание.
                    Скопируйте ссылку на запись.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Сб-Вс</div>
                    <div class="step-title">Связать всё вместе</div>
                </div>
                <div class="step-content">
                    Добавьте ссылку на онлайн-запись везде: Авито, Карты, соцсети.
                    Проверьте, что всё работает — попросите друга «записаться».
                </div>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <div class="card card-gold">
            <h3 style="margin-top: 0;">Неделя 2: Первые заявки</h3>
            <p><strong>Цель:</strong> получить минимум 3-5 входящих обращений</p>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пн</div>
                    <div class="step-title">Активация сарафана</div>
                </div>
                <div class="step-content">
                    Напишите 10-15 знакомым лично: «Привет! Я сейчас активно развиваю 
                    частную практику массажа. Если вдруг кто-то из твоих друзей ищет 
                    массажиста — буду благодарна за рекомендацию». Не продавайте — просто информируйте.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Вт</div>
                    <div class="step-title">Первый пост в соцсетях</div>
                </div>
                <div class="step-content">
                    Опубликуйте полезный пост: «5 причин боли в шее после сна» или 
                    «Почему болит поясница к вечеру». Без продажи — чистая польза.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Ср</div>
                    <div class="step-title">Поднятие объявления на Авито</div>
                </div>
                <div class="step-content">
                    Если есть возможность — примените платное поднятие (от 100 р.).
                    Если нет — немного отредактируйте объявление (это обновит дату).
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Чт</div>
                    <div class="step-title">Отработка возражений</div>
                </div>
                <div class="step-content">
                    Подготовьте ответы на типичные вопросы: «Сколько стоит?», 
                    «А вы где принимаете?», «А какое у вас образование?».
                    Используйте скрипты из раздела «Скрипты продаж».
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пт</div>
                    <div class="step-title">Партнёрства</div>
                </div>
                <div class="step-content">
                    Составьте список из 5 мест, где бывает ваша аудитория: 
                    фитнес-клубы, йога-студии, салоны красоты, медцентры.
                    Напишите или зайдите лично с предложением о сотрудничестве.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Сб-Вс</div>
                    <div class="step-title">Анализ первой недели</div>
                </div>
                <div class="step-content">
                    Посчитайте: сколько просмотров на Авито? Сколько подписчиков в соцсетях?
                    Были ли обращения? Что сработало лучше всего?
                </div>
            </div>
        </div>
        
        <div class="card card-gold">
            <h3 style="margin-top: 0;">Неделя 3: Конверсия</h3>
            <p><strong>Цель:</strong> превратить заявки в записи, записи — в визиты</p>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пн-Вт</div>
                    <div class="step-title">Скорость ответа</div>
                </div>
                <div class="step-content">
                    Отвечайте на все заявки в течение 15 минут. Установите уведомления.
                    Чем быстрее ответ — тем выше конверсия. Через час человек уже нашёл другого.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Ср-Чт</div>
                    <div class="step-title">Дожим до записи</div>
                </div>
                <div class="step-content">
                    Если человек спросил цену и замолчал — напишите через 2-3 часа:
                    «Подскажите, остались вопросы? Могу записать вас на удобное время».
                    80% клиентов теряются на этапе «подумаю».
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пт-Вс</div>
                    <div class="step-title">Первые сеансы</div>
                </div>
                <div class="step-content">
                    Проведите первые сеансы безупречно. После каждого — попросите отзыв.
                    Предложите записаться на следующий раз: «Для закрепления результата 
                    рекомендую повторить через 2 недели. Записать?»
                </div>
            </div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page3 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 2} / ${totalPages}</span>
        </div>
        
        <div class="card card-gold">
            <h3 style="margin-top: 0;">Неделя 4: Автоматизация и масштаб</h3>
            <p><strong>Цель:</strong> превратить разовые действия в систему</p>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пн</div>
                    <div class="step-title">Автонапоминания</div>
                </div>
                <div class="step-content">
                    Настройте в CRM автоматические напоминания: за день до визита, 
                    через 3 недели после визита. Это работает без вашего участия.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Вт</div>
                    <div class="step-title">Контент-план на месяц</div>
                </div>
                <div class="step-content">
                    Составьте план публикаций на следующий месяц: 3 поста в неделю.
                    Понедельник — польза, среда — закулисье, пятница — отзыв/кейс.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Ср</div>
                    <div class="step-title">Шаблоны сообщений</div>
                </div>
                <div class="step-content">
                    Сохраните готовые ответы на частые вопросы. В Telegram можно 
                    использовать быстрые ответы. Это экономит 30+ минут в день.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Чт</div>
                    <div class="step-title">Сбор отзывов</div>
                </div>
                <div class="step-content">
                    Напишите всем клиентам этого месяца с просьбой оставить отзыв 
                    на Яндекс.Картах или 2ГИС. Дайте прямую ссылку — так проще.
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Пт</div>
                    <div class="step-title">Анализ месяца</div>
                </div>
                <div class="step-content">
                    Посчитайте результаты: сколько заявок, сколько записей, сколько визитов,
                    сколько заработали. Какой канал дал больше всего клиентов?
                </div>
            </div>
            
            <div class="step-card">
                <div class="step-header">
                    <div class="step-num">Сб-Вс</div>
                    <div class="step-title">План на следующий месяц</div>
                </div>
                <div class="step-content">
                    Удвойте усилия на том канале, который сработал лучше всего.
                    Отключите или минимизируйте то, что не дало результата.
                </div>
            </div>
        </div>
        
        <h3>Чек-лист: что должно быть готово через 30 дней</h3>
        
        <div class="checklist">
            <div class="check-item">☑ Объявление на Авито (обновляется раз в неделю)</div>
            <div class="check-item">☑ Карточка на Яндекс.Картах и 2ГИС</div>
            <div class="check-item">☑ Telegram-канал или ВК с 3+ постами в неделю</div>
            <div class="check-item">☑ Онлайн-запись (YCLIENTS/Dikidi)</div>
            <div class="check-item">☑ 5+ отзывов на площадках</div>
            <div class="check-item">☑ 3+ партнёрства с местами скопления ЦА</div>
            <div class="check-item">☑ Шаблоны ответов на частые вопросы</div>
            <div class="check-item">☑ Автонапоминания для клиентов</div>
            <div class="check-item">☑ Контент-план на следующий месяц</div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат через 30 дней</div>
            <div class="result-value">+5-10 новых клиентов</div>
        </div>
        
        <div class="tip-box">
            <strong>Главный секрет:</strong> не пытайтесь сделать всё идеально. 
            Сделайте «достаточно хорошо» и запустите. Потом улучшите. 
            Лучше работающее объявление с 1 фото, чем идеальное, которое вы так и не выложили.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2 + page3;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: scripts-first-clients
 * 
 * Скрипты для первых клиентов — ответы на заявки, закрытие на запись
 * Используется в: salon-exit, hybrid-exit, hybrid-grow, private-grow
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_scripts_first_clients(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Скрипты для работы с заявками</h2>
        
        <p class="lead">
            Большинство мастеров теряют клиентов не потому, что плохо делают массаж, 
            а потому что не умеют отвечать на заявки. Вот готовые скрипты, которые 
            увеличат вашу конверсию в 2-3 раза.
        </p>
        
        <h3>Как отвечать на «Сколько стоит?»</h3>
        
        <div class="warning-box">
            <strong>Типичная ошибка:</strong> просто написать цену и ждать. 
            Так вы теряете 70% клиентов. Они сравнивают цены и уходят к тому, 
            кто дал больше информации.
        </div>
        
        <div class="template-box">
            <div class="template-title">Скрипт ответа на «Сколько стоит?»</div>
            <div class="template-content">Здравствуйте! Спасибо за интерес 😊

Сеанс массажа 60 минут — ${data.privatePrice || '2500'} р.
Сеанс 90 минут — ${Math.round((data.privatePrice || 2500) * 1.4)} р.

Принимаю ${data.workPlaceName || 'в кабинете'} [адрес/район].
Работаю: Пн-Сб с 10:00 до 20:00

Подскажите, что вас беспокоит? Спина, шея, общее напряжение? 
Подберу оптимальный вариант под вашу ситуацию.</div>
        </div>
        
        <div class="tip-box">
            <strong>Почему это работает:</strong> вы сразу даёте всю нужную информацию 
            (цена, время, место) и задаёте вопрос, который продолжает диалог. 
            Человек отвечает — и вы уже в разговоре, а не просто «ценник».
        </div>
        
        <h3>Как закрывать на запись</h3>
        
        <p>Клиент узнал цену и замолчал? Не ждите — напишите сами через 2-3 часа:</p>
        
        <div class="template-box">
            <div class="template-title">Скрипт дожима</div>
            <div class="template-content">Добрый день! Подскажите, остались вопросы?

У меня есть окошки на этой неделе:
• Среда, 18:00
• Пятница, 15:00  
• Суббота, 11:00

Какое время удобнее? Или подберём другое.</div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Если клиент говорит «Я подумаю»</div>
            <div class="template-content">Конечно, подумайте! Это важное решение 😊

Если будут вопросы — пишите, я на связи.

Кстати, если запишетесь до [дата], первый сеанс со скидкой 10% — 
как раз познакомимся, и вы поймёте, подходит ли вам мой подход.</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Частые возражения и ответы</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">«Дорого»</div>
            </div>
            <div class="step-content">
                «Понимаю, цена важна. Скажите, с чем сравниваете? 
                Мои клиенты часто говорят, что после одного сеанса у меня 
                эффект как после трёх в другом месте. Может, попробуем 
                первый сеанс, и вы сами оцените?»
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">«Далеко ехать»</div>
            </div>
            <div class="step-content">
                «Да, понимаю, время — ценный ресурс. Многие мои клиенты 
                специально едут ко мне с другого конца города, потому что 
                результат того стоит. Давайте попробуем один раз — 
                если не понравится, больше не буду вас уговаривать 😊»
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">«Нет времени»</div>
            </div>
            <div class="step-content">
                «Это как раз тот случай, когда массаж особенно нужен 😊 
                У меня есть ранние слоты в 8:00 и вечерние до 21:00. 
                А ещё работаю по субботам. Какой вариант удобнее посмотреть?»
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">4</div>
                <div class="step-title">«Мне нужно посоветоваться»</div>
            </div>
            <div class="step-content">
                «Конечно! Если нужно, могу скинуть ссылку на мои отзывы — 
                там клиенты рассказывают о своём опыте. А ещё есть фото 
                кабинета и сертификаты — чтобы было проще принять решение.»
            </div>
        </div>
        
        <h3>Готовый текст для прайса</h3>
        
        <div class="template-box">
            <div class="template-title">Шаблон прайс-листа</div>
            <div class="template-content">МАССАЖ | ${data.userName || 'Имя'} | ${data.cityName || 'Москва'}

━━━━━━━━━━━━━━━━━━━━━━━━

КЛАССИЧЕСКИЙ МАССАЖ
• Спина (30 мин) — ${Math.round((data.privatePrice || 2500) * 0.6)} р.
• Всё тело (60 мин) — ${data.privatePrice || 2500} р.
• Расширенный (90 мин) — ${Math.round((data.privatePrice || 2500) * 1.4)} р.

ЛЕЧЕБНЫЙ МАССАЖ
• Шейно-воротниковая зона — ${Math.round((data.privatePrice || 2500) * 0.5)} р.
• Поясничный отдел — ${Math.round((data.privatePrice || 2500) * 0.6)} р.
• Проработка триггеров — ${Math.round((data.privatePrice || 2500) * 1.2)} р.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 ${data.workPlaceName || 'Кабинет'} [адрес]
🕐 Пн-Сб 10:00-20:00
📲 Запись: [ссылка или телефон]</div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат от скриптов</div>
            <div class="result-value">Конверсия заявка → запись: 40-60%</div>
        </div>
        
        <div class="tip-box">
            <strong>Золотое правило:</strong> отвечайте на заявки в течение 15 минут. 
            Через час человек уже нашёл другого мастера. Настройте уведомления 
            на все площадки.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: channel-partnerships
 * 
 * Партнёрства с фитнес-клубами, йога-студиями, салонами
 * Используется в: salon-exit, hybrid, private
 * Страниц: 2
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_channel_partnerships(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Партнёрства: клиенты через чужие бизнесы</h2>
        
        <p class="lead">
            Партнёрства — один из самых недооценённых каналов. Вы получаете клиентов, 
            которые уже доверяют рекомендации места, куда они ходят. Конверсия выше, 
            чем с холодной рекламы, а затраты — ноль или минимум.
        </p>
        
        <h3>С кем партнёриться</h3>
        
        <div class="two-cols">
            <div class="card card-gold">
                <h4>Идеальные партнёры</h4>
                <ul class="simple-list">
                    <li><strong>Фитнес-клубы</strong> — после тренировок болят мышцы</li>
                    <li><strong>Йога-студии</strong> — аудитория заботится о теле</li>
                    <li><strong>Салоны красоты</strong> — без массажиста в штате</li>
                    <li><strong>Барбершопы</strong> — мужская аудитория</li>
                    <li><strong>Медцентры</strong> — после реабилитации</li>
                    <li><strong>Частные тренеры</strong> — ведут клиентов</li>
                </ul>
            </div>
            <div class="card card-bordered">
                <h4>Что предложить</h4>
                <ul class="simple-list">
                    <li>10-15% от чека за приведённого клиента</li>
                    <li>Бесплатный массаж для владельца/менеджера</li>
                    <li>Скидку для их клиентов (5-10%)</li>
                    <li>Визитки на стойку</li>
                    <li>Взаимный пиар в соцсетях</li>
                </ul>
            </div>
        </div>
        
        <h3>Как договориться: пошаговый скрипт</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Подготовка</div>
            </div>
            <div class="step-content">
                Составьте список из 10-15 мест в вашем районе. Проверьте, нет ли у них 
                уже массажиста. Подпишитесь на их соцсети — поймёте атмосферу и ценности.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Первый контакт</div>
            </div>
            <div class="step-content">
                Лучше зайти лично, чем писать. Представьтесь: «Здравствуйте, я массажист, 
                работаю рядом. У меня есть идея, как мы можем быть полезны друг другу. 
                С кем можно поговорить 5 минут?»
            </div>
        </div>
        
        <div class="template-box">
            <div class="template-title">Скрипт разговора</div>
            <div class="template-content">«Я массажист, принимаю в [район]. Заметил(а), что у вас 
много клиентов, которым может быть полезен массаж после 
[тренировок / процедур / рабочего дня].

Предлагаю такой формат: вы рекомендуете меня своим 
клиентам, а я даю им скидку 10% как вашим гостям. 
За каждого клиента, который придёт от вас, 
я готов(а) платить 15% от чека.

Могу оставить визитки. А ещё — сделаю вам 
бесплатный сеанс, чтобы вы понимали, что рекомендуете.»</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    const page2 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum + 1} / ${totalPages}</span>
        </div>
        
        <h3>Что дать партнёру</h3>
        
        <div class="numbered-list">
            <li><strong>Визитки</strong> — 50-100 штук на стойку администратора</li>
            <li><strong>Флаер А5</strong> — с вашим предложением и скидкой для их клиентов</li>
            <li><strong>Промокод</strong> — уникальный для каждого партнёра (для отслеживания)</li>
            <li><strong>QR-код</strong> — ведёт на вашу онлайн-запись</li>
        </div>
        
        <h3>Как отслеживать результат</h3>
        
        <div class="card card-bordered">
            <p>Создайте уникальный промокод для каждого партнёра:</p>
            <ul class="simple-list">
                <li>«ФИТНЕС10» — для фитнес-клуба</li>
                <li>«ЙОГА10» — для йога-студии</li>
                <li>«САЛОН10» — для салона красоты</li>
            </ul>
            <p>Когда клиент называет код — вы знаете, откуда он пришёл, 
            и можете выплатить партнёру его процент.</p>
        </div>
        
        <h3>Важные детали</h3>
        
        <div class="warning-box">
            <strong>Не делайте так:</strong>
            <ul class="simple-list">
                <li>Не предлагайте партнёрство конкурентам (массажным салонам)</li>
                <li>Не обещайте то, что не сможете выполнить</li>
                <li>Не забывайте платить проценты вовремя — репутация важнее денег</li>
            </ul>
        </div>
        
        <div class="tip-box">
            <strong>Лайфхак:</strong> начните с одного партнёра и отработайте схему. 
            Когда поймёте, что работает — масштабируйте на остальных.
        </div>
        
        <h3>Ожидаемые результаты</h3>
        
        <div class="card card-gold">
            <table class="data-table">
                <tr>
                    <th>Партнёр</th>
                    <th>Клиентов в месяц</th>
                    <th>Ваши затраты</th>
                </tr>
                <tr>
                    <td>Фитнес-клуб</td>
                    <td>2-5</td>
                    <td>15% от чека</td>
                </tr>
                <tr>
                    <td>Салон красоты</td>
                    <td>1-3</td>
                    <td>15% от чека</td>
                </tr>
                <tr>
                    <td>Частный тренер</td>
                    <td>1-2</td>
                    <td>15% от чека</td>
                </tr>
            </table>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат от 3-5 партнёров</div>
            <div class="result-value">5-15 клиентов в месяц</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1 + page2;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: channel-word-of-mouth
 * 
 * Сарафанное радио: как системно получать рекомендации
 * Используется в: все сценарии
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_channel_word_of_mouth(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Сарафанное радио: система рекомендаций</h2>
        
        <p class="lead">
            «Сарафан» — это не везение, а система. Довольный клиент не рекомендует вас 
            автоматически — нужно создать условия, чтобы ему было легко и приятно это сделать.
        </p>
        
        <h3>3 правила работающего сарафана</h3>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Просите рекомендации напрямую</div>
            </div>
            <div class="step-content">
                После сеанса, когда клиент доволен: «Мне очень приятно, что вам понравилось! 
                Если кто-то из ваших знакомых тоже ищет массажиста — буду благодарна за рекомендацию. 
                Могу дать визитку для передачи.»
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Дайте повод рассказать о вас</div>
            </div>
            <div class="step-content">
                Сделайте что-то запоминающееся: травяной чай после сеанса, 
                рекомендации по упражнениям на листочке, неожиданный комплимент. 
                Люди рассказывают о том, что их удивило.
            </div>
        </div>
        
        <div class="step-card">
            <div class="step-header">
                <div class="step-num">3</div>
                <div class="step-title">Поощряйте рекомендации</div>
            </div>
            <div class="step-content">
                «Если приведёте друга — вам обоим скидка 10% на следующий сеанс». 
                Это работает лучше, чем просто просить. Выгода для обеих сторон.
            </div>
        </div>
        
        <h3>Как запустить сарафан с нуля</h3>
        
        <div class="numbered-list">
            <li><strong>Напишите 20 знакомым лично</strong> — не в общий чат, а каждому отдельно. 
                «Привет! Я развиваю частную практику массажа. Если вдруг кто-то из твоих 
                знакомых будет искать — буду благодарна за рекомендацию».</li>
            <li><strong>Попросите близких сделать репост</strong> вашего поста о массаже в соцсетях.</li>
            <li><strong>Предложите бесплатный сеанс 3-5 друзьям</strong> в обмен на честный отзыв 
                и рекомендации (если понравится).</li>
            <li><strong>Дайте визитки постоянным клиентам</strong> — по 5-10 штук каждому: 
                «Вдруг кому пригодится».</li>
        </div>
        
        <div class="template-box">
            <div class="template-title">Шаблон сообщения для знакомых</div>
            <div class="template-content">Привет! Хочу поделиться — я сейчас активно развиваю 
свою практику массажа. Принимаю ${data.workPlaceName || 'в кабинете'} 
в [район].

Если вдруг ты или кто-то из твоих знакомых ищет 
хорошего массажиста — буду очень рада, если порекомендуешь! 
Для друзей друзей — скидка 10% 😊

[ссылка на запись или контакт]</div>
        </div>
        
        <div class="result-box">
            <div class="result-label">Ожидаемый результат</div>
            <div class="result-value">1-3 клиента в месяц (бесплатно)</div>
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF BLOCK: legal-ip-ausn
 * 
 * Юридическое оформление: АУСН 8%, самозанятость, ИП
 * Используется в: salon-exit, private-grow, private-optimize
 * Страниц: 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

function block_legal_ip_ausn(data, pageNum, totalPages) {
    
    const page1 = `
    <div class="page">
        <div class="page-header">
            <span class="logo">Навигатор роста</span>
            <span class="page-num">${pageNum} / ${totalPages}</span>
        </div>
        
        <h2>Как оформиться: самозанятость vs ИП</h2>
        
        <p class="lead">
            Работать «в серую» — рискованно. Штрафы, проблемы с арендодателями, 
            невозможность принимать оплату картой. Разберём, как оформиться правильно 
            с минимумом налогов и бюрократии.
        </p>
        
        <h3>Три варианта оформления в 2026 году</h3>
        
        <div class="card card-gold">
            <h4>🥇 АУСН «Доходы» — лучший выбор для большинства</h4>
            <p><strong>Автоматизированная упрощённая система налогообложения</strong></p>
            <ul class="simple-list">
                <li><strong>Налог: всего 8%</strong> от дохода (включает все взносы!)</li>
                <li>Никаких деклараций и отчётности</li>
                <li>Не нужно вести книгу учёта</li>
                <li>Налог считается и списывается автоматически</li>
                <li>Лимит: до 60 млн р./год</li>
            </ul>
            <p style="color: #7ec8a3;"><strong>Идеально, если:</strong> доход больше 200 000 р./мес 
            или нужен официальный статус для аренды/партнёров.</p>
        </div>
        
        <div class="two-cols">
            <div class="card card-bordered">
                <h4>🥈 Самозанятость (НПД)</h4>
                <ul class="simple-list">
                    <li>Налог: 4% (физлица) / 6% (юрлица)</li>
                    <li>Лимит: 2,4 млн р./год</li>
                    <li>Нет пенсионных взносов</li>
                    <li>Оформление за 5 минут</li>
                </ul>
                <p style="color: #d4a574;"><strong>Минус:</strong> если доход >200 000 р./мес — 
                превысите лимит к осени.</p>
            </div>
            <div class="card card-bordered">
                <h4>🥉 ИП на УСН 6%</h4>
                <ul class="simple-list">
                    <li>Налог: 6% + взносы (~50 000 р./год)</li>
                    <li>Нужна декларация раз в год</li>
                    <li>Нужно вести КУДиР</li>
                    <li>Лимит: до 200 млн р./год</li>
                </ul>
                <p style="color: #d4a574;"><strong>Минус:</strong> больше бюрократии, 
                чем АУСН.</p>
            </div>
        </div>
        
        <h3>Что выбрать?</h3>
        
        <div class="card card-bordered">
            <table class="data-table">
                <tr>
                    <th>Ваш доход</th>
                    <th>Рекомендация</th>
                </tr>
                <tr>
                    <td>До 100 000 р./мес</td>
                    <td>Самозанятость</td>
                </tr>
                <tr>
                    <td>100-200 000 р./мес</td>
                    <td>Самозанятость или АУСН</td>
                </tr>
                <tr>
                    <td>Больше 200 000 р./мес</td>
                    <td><strong>АУСН «Доходы»</strong></td>
                </tr>
            </table>
        </div>
        
        <div class="tip-box">
            <strong>Как перейти на АУСН:</strong> откройте ИП через Госуслуги или банк (Тинькофф, Точка), 
            при регистрации выберите АУСН. Если уже есть ИП — подайте заявление на смену режима 
            до 31 декабря (вступит в силу с 1 января).
        </div>
        
        <div class="warning-box">
            <strong>Важно:</strong> АУСН работает не во всех регионах. Проверьте на сайте ФНС, 
            доступен ли режим в вашем городе. Если нет — выбирайте УСН 6%.
        </div>
        
        <div class="page-footer">massagestart.ru</div>
    </div>`;
    
    return page1;
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППИНГ БЛОКОВ
// ═══════════════════════════════════════════════════════════════════════════

const BLOCK_FUNCTIONS = {
    'channel-avito': block_channel_avito,
    'channel-yandex-maps': block_channel_yandex_maps,
    'channel-social': block_channel_social,
    'channel-partnerships': block_channel_partnerships,
    'channel-word-of-mouth': block_channel_word_of_mouth,
    'retention-system': block_retention_system,
    'retention-templates': block_retention_templates,
    'retention-7-techniques': block_retention_7_techniques,
    'retention-automation': block_retention_automation,
    'retention-advanced': block_retention_advanced,
    'retention-loyalty': block_retention_loyalty,
    'exit-calculator': block_exit_calculator,
    'exit-timeline': block_exit_timeline,
    'exit-checklist-12': block_exit_checklist_12,
    'hybrid-exit-calculator': block_hybrid_exit_calculator,
    'hybrid-exit-timeline': block_hybrid_exit_timeline,
    'negotiate-script': block_negotiate_script,
    'negotiate-arguments': block_negotiate_arguments,
    'negotiate-timing': block_negotiate_timing,
    'negotiate-prepare': block_negotiate_prepare,
    'raise-price-strategy': block_raise_price_strategy,
    'raise-price-scripts': block_raise_price_scripts,
    'raise-price-faq': block_raise_price_faq,
    'raise-price-premium': block_raise_price_premium,
    'raise-price-positioning': block_raise_price_positioning,
    'loyal-clients-7-techniques': block_loyal_clients_7_techniques,
    'loyal-clients-templates': block_loyal_clients_templates,
    'track-loyal-clients': block_track_loyal_clients,
    'client-base-template': block_client_base_template,
    'client-base-how-to': block_client_base_how_to,
    'crm-comparison': block_crm_comparison,
    'crm-setup-guide': block_crm_setup_guide,
    'reviews-how-to-ask': block_reviews_how_to_ask,
    'reviews-templates': block_reviews_templates,
    'place-comparison': block_place_comparison,
    'place-checklist': block_place_checklist,
    'grow-private-strategy': block_grow_private_strategy,
    'grow-private-schedule': block_grow_private_schedule,
    'scaling-teach-formats': block_scaling_teach_formats,
    'scaling-teach-pricing': block_scaling_teach_pricing,
    'scaling-teach-first-students': block_scaling_teach_first_students,
    'scaling-own-space-economics': block_scaling_own_space_economics,
    'scaling-own-space-checklist': block_scaling_own_space_checklist,
    'scaling-hire-assistant': block_scaling_hire_assistant,
    'scaling-subrent': block_scaling_subrent,
    'scaling-team-economics': block_scaling_team_economics,
    'plan-30-days': block_plan_30_days,
    'scripts-first-clients': block_scripts_first_clients,
    'legal-ip-ausn': block_legal_ip_ausn
};

// Количество страниц для каждого блока
const BLOCK_PAGES = {
    'channel-avito': 2,
    'channel-yandex-maps': 2,
    'channel-social': 2,
    'retention-system': 2,
    'retention-templates': 2,
    'retention-7-techniques': 2,
    'retention-automation': 1,
    'retention-advanced': 1,
    'retention-loyalty': 1,
    'exit-calculator': 1,
    'exit-timeline': 2,
    'exit-checklist-12': 1,
    'hybrid-exit-calculator': 1,
    'hybrid-exit-timeline': 1,
    'negotiate-script': 1,
    'negotiate-arguments': 1,
    'negotiate-timing': 1,
    'negotiate-prepare': 1,
    'raise-price-strategy': 1,
    'raise-price-scripts': 1,
    'raise-price-faq': 1,
    'raise-price-premium': 1,
    'raise-price-positioning': 1,
    'loyal-clients-7-techniques': 2,
    'loyal-clients-templates': 1,
    'track-loyal-clients': 1,
    'client-base-template': 1,
    'client-base-how-to': 1,
    'crm-comparison': 1,
    'crm-setup-guide': 2,
    'reviews-how-to-ask': 1,
    'reviews-templates': 1,
    'place-comparison': 1,
    'place-checklist': 1,
    'grow-private-strategy': 1,
    'grow-private-schedule': 1,
    'scaling-teach-formats': 1,
    'scaling-teach-pricing': 1,
    'scaling-teach-first-students': 1,
    'scaling-own-space-economics': 1,
    'scaling-own-space-checklist': 1,
    'scaling-hire-assistant': 1,
    'scaling-subrent': 1,
    'scaling-team-economics': 1,
    'plan-30-days': 3,
    'scripts-first-clients': 2,
    'channel-partnerships': 2,
    'channel-word-of-mouth': 1,
    'legal-ip-ausn': 1
};

// ═══════════════════════════════════════════════════════════════════════════
// ПОДСЧЁТ СТРАНИЦ
// ═══════════════════════════════════════════════════════════════════════════

function countTotalPages(steps) {
    let total = 1; // Титульная
    total += 1; // Ситуация
    total += 1; // План (превью шагов)
    
    // Страницы шагов
    for (const step of steps) {
        total += 1; // Вводная страница шага
        for (const blockId of step.pdfBlocks) {
            total += BLOCK_PAGES[blockId] || 1;
        }
    }
    
    total += 2; // Финальная (теперь 2 страницы: Курс + Навигатор)
    
    return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ PDF
// ═══════════════════════════════════════════════════════════════════════════

function generatePdfHtml(state) {
    const data = prepareData(state);
    const steps = getPersonalizedSteps(state);
    const totalPages = countTotalPages(steps);
    
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=210mm, initial-scale=1.0">
    <title>План роста — ${data.userName}</title>
    <style>${PDF_STYLES}</style>
</head>
<body>`;
    
    let currentPage = 1;
    
    // 1. Титульная страница
    html += titlePage(data);
    currentPage++;
    
    // 2. Ваша ситуация
    html += situationPage(data, currentPage, totalPages);
    currentPage++;
    
    // 3. План (превью шагов)
    html += potentialPage(data, steps, currentPage, totalPages);
    currentPage++;
    
    // 4. Детализация каждого шага
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Вводная страница шага
        html += stepIntroPage(step, i, data, currentPage, totalPages);
        currentPage++;
        
        // Блоки контента
        for (const blockId of step.pdfBlocks) {
            const blockFn = BLOCK_FUNCTIONS[blockId];
            if (blockFn) {
                html += blockFn(data, currentPage, totalPages);
                currentPage += BLOCK_PAGES[blockId] || 1;
            }
        }
    }
    
    // 5. Финальная страница
    html += finalPage(data, currentPage, totalPages);
    
    html += `</body></html>`;
    
    return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// ГЕНЕРАЦИЯ PDF С ПОМОЩЬЮ html2canvas + jsPDF
// ═══════════════════════════════════════════════════════════════════════════

async function generateAndDownloadPdf(state, filename) {
    const htmlContent = generatePdfHtml(state);
    
    // Создаём скрытый контейнер
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 210mm;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    
    // Ждём загрузки шрифтов и рендеринга
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pages = container.querySelectorAll('.page');
    const pdf = new jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#0d0d14'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
            pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
    }
    
    // Добавляем кликабельные ссылки на последние 2 страницы (CTA)
    // Координаты в мм от верхнего левого угла страницы
    const totalPdfPages = pdf.internal.getNumberOfPages();
    
    // Предпоследняя страница: Курс "7 дней"
    pdf.setPage(totalPdfPages - 1);
    pdf.link(15, 80, 180, 160, { url: 'https://lp.massagestart.ru' });
    
    // Последняя страница: Персональный навигатор + Email
    pdf.setPage(totalPdfPages);
    pdf.link(15, 40, 180, 170, { url: 'https://forms.gle/sq3ns2Co5CNjoP6h6' });
    pdf.link(15, 215, 180, 40, { url: 'mailto:7days@massagestart.ru' });
    
    // Удаляем контейнер
    document.body.removeChild(container);
    
    // Сохраняем PDF
    pdf.save(filename || 'navigator-plan.pdf');
    
    return pdf;
}

// ═══════════════════════════════════════════════════════════════════════════
// СОХРАНЕНИЕ В IndexedDB
// ═══════════════════════════════════════════════════════════════════════════

async function savePdfToIndexedDB(state) {
    const htmlContent = generatePdfHtml(state);
    
    // Создаём контейнер для рендеринга
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 210mm;';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pages = container.querySelectorAll('.page');
    const pdf = new jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
   // ===== НОВАЯ ФУНКЦИЯ =====
function compressPageIfNeeded(pageElement) {
    // Проверяем высоту страницы
    const pageHeight = pageElement.scrollHeight;
    const maxHeight = 297 * 3.78; // Высота A4 в пикселях
    
    // Если страница слишком высокая
    if (pageHeight > maxHeight) {
        // Вычисляем на сколько нужно сжать (90% от максимума)
        const compressRatio = maxHeight / pageHeight * 0.9;
        
        // Находим ВСЕ текстовые элементы на странице
        const textElements = pageElement.querySelectorAll(
            'p, h1, h2, h3, h4, li, span, div, td, th'
        );
        
        // Для каждого элемента
        textElements.forEach(element => {
            // Получаем текущие размеры
            const style = window.getComputedStyle(element);
            
            // 1. Сжимаем размер шрифта
            const fontSize = style.fontSize; // Например: "16px"
            if (fontSize && fontSize !== '0px') {
                const sizeNumber = parseFloat(fontSize); // 16
                element.style.fontSize = (sizeNumber * compressRatio) + 'px';
            }
            
            // 2. Сжимаем межстрочный интервал
            const lineHeight = style.lineHeight; // Например: "24px"
            if (lineHeight && lineHeight !== 'normal' && lineHeight !== '0px') {
                const lineNumber = parseFloat(lineHeight); // 24
                element.style.lineHeight = (lineNumber * compressRatio) + 'px';
            }
        });
        
        console.log(`[PDF] Страница сжата: ${Math.round(compressRatio * 100)}%`);
        return true; // Сжатие применено
    }
    
    return false; // Сжатие не нужно
}
// ===== КОНЕЦ НОВОЙ ФУНКЦИИ ===== 
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#0d0d14'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
    }
    
    // Кликабельные ссылки на последние 2 страницы (CTA)
    // Координаты в мм от верхнего левого угла страницы
    const totalPdfPages = pdf.internal.getNumberOfPages();
    
    // Предпоследняя страница: Курс "7 дней"
    pdf.setPage(totalPdfPages - 1);
    pdf.link(15, 80, 180, 160, { url: 'https://lp.massagestart.ru' });
    
    // Последняя страница: Персональный навигатор + Email
    pdf.setPage(totalPdfPages);
    pdf.link(15, 40, 180, 170, { url: 'https://forms.gle/sq3ns2Co5CNjoP6h6' });
    pdf.link(15, 215, 180, 40, { url: 'mailto:7days@massagestart.ru' });
    
    document.body.removeChild(container);
    
    // Сохраняем в IndexedDB
    const pdfBlob = pdf.output('blob');
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NavigatorPDF', 1);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pdfs')) {
                db.createObjectStore('pdfs', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('pdfs', 'readwrite');
            const store = tx.objectStore('pdfs');
            
            store.put({
                id: 'current-pdf',
                blob: pdfBlob,
                filename: `plan-${state.name || 'navigator'}.pdf`,
                createdAt: new Date().toISOString()
            });
            
            tx.oncomplete = () => resolve(pdfBlob);
            tx.onerror = () => reject(tx.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function getPdfFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NavigatorPDF', 1);
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('pdfs', 'readonly');
            const store = tx.objectStore('pdfs');
            const getRequest = store.get('current-pdf');
            
            getRequest.onsuccess = () => {
                resolve(getRequest.result);
            };
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════════

// Для использования в браузере — функции уже в глобальной области
// Для Node.js:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePdfHtml,
        generateAndDownloadPdf,
        savePdfToIndexedDB,
        getPdfFromIndexedDB,
        getPersonalizedSteps,
        prepareData,
        getScenario
    };
}

const RtmClient = require('@slack/client').RtmClient;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const moment = require('moment');
const publishGraph = require('./publish-graph');
const Router = require('./router');
const QueriesCollection = require('./queries-collection');

/**
 * Максимальное число точек для одного графа.
 * @type {number}
 */
const MAX_POINTS = 20;

/** @type {string} */
var botId = '';

/**
 * Хранит запросы от пользователей.
 */
var queries = new QueriesCollection();

const rtm = new RtmClient(process.env.SLACK_API_TOKEN , {
    logLevel: 'error',
    dataStore: new MemoryDataStore()
});

const router = new Router(rtm);

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    botId = rtmStartData.self.id;
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);

    init();
});

rtm.start();

function init() {

    /**
     * Логирование сообщений.
     */
    router.message(Router.ANY_MESSAGE, (rtm, {user, text}) => {

        let date = moment().format('DD.MM.YY kk:mm:ss'),
            userName = '?';

        if (rtm.dataStore.getUserById(user)) 
            userName = rtm.dataStore.getUserById(user).name;

        console.info(`[${date}] ${userName}: ${text}`);

        /**
         * Если обработчки возвращает true - роутер продолжает перебирать остальные обработчики.
         */
        return true;

    });

    /**
     * Справка.
     */
    router.message('help', (rtm, {channel}) => {

        rtm.sendMessage(
            `\`<@${botId}>: get velocity graph\` - to start collecting points\n` + 
            '`done` - to start processing input data\n' +
            '`help` - to getting help',
            channel
        );

    });

    /**
     * Начать работу.
     */
    router.message(`<@${botId}>: get velocity graph`, (rtm, {user, channel}) => {
        //регистрация запроса
        queries.register(user, channel);
        
        rtm.sendMessage(
            'Hi! Im ready to listening. Type me in each message two digits: sprint number and done story points. ' + 
            'Type `done` to start processing input data.', 
            channel
        );

    });

    /**
     * Завершить сбор точек.
     */
    router.message('done', (rtm, {user, channel}) => {

        if (!queries.has(user, channel)) {
            return;
        }

        let points = queries.get(user, channel);
        queries.unregister(user, channel);

        if (points.length == 0) {
            rtm.sendMessage('There are no points. The collecting is canceled.', channel);
            return;
        }

        rtm.sendMessage('Wait a minute..', channel);

        publishGraph(points).then((url) => {
            rtm.sendMessage(url, channel);  
        }, () => {
            rtm.sendMessage('Something has gone wrong. Sorry ;(', channel); 
        });

    });

    /**
     * Ввод точки.
     */
    router.message(/^([\-]{0,1}\d{1,11}) ([\-]{0,1}\d{1,11})$/, (rtm, {user, channel}, [x, y]) => {

        if (!queries.has(user, channel)) {
            return;
        }

        let points = queries.get(user, channel);

        if (points.length >= MAX_POINTS) {
            rtm.sendMessage(
                `Exceeded maximum number of points (${MAX_POINTS})!` + 
                'Type `done` to start processing input data', 
                channel
            );

            return;  
        }

        points.push([x,y]);

    });

    /**
     * Если сообщение дошло сюда при том, что сессия по сборке для этого юзера в этом канале начата,
     * значит юзер ввел неверные данные.
     */
    router.message(Router.ANY_MESSAGE, (rtm, {user, channel}) => {

        if (queries.has(user, channel)) {
            rtm.sendMessage('Incorrect data. Please, try again, bro.', channel);
        }
    
    });
}

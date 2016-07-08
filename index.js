const RtmClient = require('@slack/client').RtmClient;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const moment = require('moment');
const publishGraph = require('./publish-graph');

/**
 * Максимальное число точек для одного графа.
 * @type {number}
 */
const MAX_POINTS = 20;

const rtm = new RtmClient(process.env.SLACK_API_TOKEN , {
    logLevel: 'error',
    dataStore: new MemoryDataStore()
});

var botId = '';

/**
 * Хранит запросы от пользователей.
 */
var queries = new Map();

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    botId = rtmStartData.self.id;
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
 
    if (message.type !== 'message' || message.subtype !== undefined) return;

    let {user, channel, text} = message,
        date = moment().format('DD.MM.YY kk:mm:ss'),
        userName = '?';

    if (rtm.dataStore.getUserById(message.user)) 
        userName = rtm.dataStore.getUserById(message.user).name;

    console.info(`[${date}] ${userName}: ${text}`);

    if (text == 'help') {
        rtm.sendMessage(
            `\`<@${botId}>: get velocity graph\` - to start collecting points\n` + 
            '`done` - to start processing input data\n' +
            '`help` - to getting help',
            message.channel
        );

        return;
    }

    if (text == `<@${botId}>: get velocity graph`) {
        //регистрация запроса
        queries.set(user+channel, []);
        
        rtm.sendMessage(
            'Hi! Im ready to listening. Type me in each message two digits: sprint number and done story points. ' + 
            'Type `done` to start processing input data.', 
            message.channel
        );

        return;
    }

    if (queries.has(user+channel)) {

        /**
         * Окончание сбора данных и построение графика.
         */
        if (text == 'done') {
            let points = queries.get(user+channel);

            queries.delete(user+channel);

            if (points.length == 0) {
                rtm.sendMessage('There are no points. The operation is canceled.', message.channel);
                return;
            }

            rtm.sendMessage('Wait a minute', message.channel);

            publishGraph(channel, points).then((url) => {
                rtm.sendMessage(url, message.channel);  
            }, () => {
                rtm.sendMessage('Something has gone wrong. Sorry ;(', message.channel); 
            });

            return;
        }
        
        /**
         * Сбор точек для графика.
         */
        let coords = text.match(/^([\-]{0,1}\d+) ([\-]{0,1}\d+)$/);

        if (coords == null || coords.length !== 3) {
            rtm.sendMessage('Incorrect data. Please, try again!', message.channel);
        } else {
            
            let points = queries.get(user+channel);

            if (points.length >= MAX_POINTS) {
                rtm.sendMessage(
                    `Exceeded maximum number of points (${MAX_POINTS})!` + 
                    'Type `done` to start processing input data', 
                    message.channel
                );

                return;  
            }

            let x = coords[1],
                y = coords[2];

            points.push([x,y]);
        }
    }
  
});

rtm.start();


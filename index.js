const RtmClient = require('@slack/client').RtmClient;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const moment = require('moment');
const sendGraph = require('./send-graph');

const rtm = new RtmClient(process.env.SLACK_API_TOKEN , {
    logLevel: 'error',
    dataStore: new MemoryDataStore()
});

var botId = '';
var queryPattern = null;
var queries = new Map();

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    botId = rtmStartData.self.id;
    queryPattern = new RegExp(`^<@${botId}>: get velocity graph$`);
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

 
rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    let {user, channel, text} = message,
        date = moment().format('DD.MM.YY kk:mm:ss');

    console.info(`[${date}] ${rtm.dataStore.getUserById(message.user).name}: ${text}`);

    if (queryPattern.test(text)) {
        queries.set(user+channel, []);
        
        rtm.sendMessage(
            'Hi! Im ready to listening. Type me in each message two digits: sprint number and done story points.' + 
            'Type done to start processing input data.', 
            message.channel
        );

        return;
    }

    if (queries.has(user+channel)) {
 
        if (text == 'done') {
            rtm.sendMessage('Wait a minute', message.channel);

            let points = queries.get(user+channel);
            queries.delete(user+channel);

            sendGraph(channel, points).then((res) => {
                rtm.sendMessage(res, message.channel);  
            }, () => {
                rtm.sendMessage('Error ;(', message.channel); 
            });

            return;
        }

        let coords = text.match(/^(\d+) (\d+)$/);

        console.log(coords);
        if (coords == null || coords.length !== 3) {

            rtm.sendMessage('Illegal data. Please, try again!', message.channel);

        } else {
            let x = coords[1],
                y = coords[2];
                
            queries.get(user+channel).push([x,y]);
        }
    }
  
});

rtm.start();


const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

/**
 * Роутер для перехвата сообщений по шаблону.
 */
class Router {
    /**
     * @param {RtmClient} rtm
     */
    constructor(rtm) {
        this.rtm = rtm;
        this.handlers = [];

        rtm.on(RTM_EVENTS.MESSAGE, this._onMessage.bind(this));
    }

    /**
     * @param {object} message
     */
    _onMessage(message) {

        let {text} = message;

        //по-умолчанию только обычные сообщения
        if (message.type !== 'message' || message.subtype !== undefined) return;

        for (let item of this.handlers) {
   
            let {pattern, handler} = item;

            if (pattern instanceof RegExp) {
            
                let res = text.match(pattern);
                if (res) {
                    let params = [];

                    for (let i=1; i<res.length; i++) {
                        params.push(res[i]);
                    }
                    
                    //если обработчки вернет true - нужно продолжить перебор, иначе прервать
                    if (handler(this.rtm, message, params) !== true) {
                        break;
                    }
                }

            } else if (typeof pattern == 'string') {
                if (pattern.toLowerCase() == text.toLowerCase()) {
                    if (handler(this.rtm, message, null) !== true) {
                        break;
                    }
                }
            } else if (pattern == Router.ANY_MESSAGE) {
                if (handler(this.rtm, message, null) !== true) {
                    break;
                }
            }
        
        }
    }

    /**
     * Зарегистрировать обработчк.
     * 
     * @param {string|RegExp|Symbol} pattern
     * @param {function} handler
     */
    message(pattern, handler) {
        this.handlers.push({
            pattern,
            handler
        });
    }
}

Router.ANY_MESSAGE = Symbol();

module.exports = Router;
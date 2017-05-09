// This is the code for the Botpress Topic module based on Bottr's Topics
// Written by James Campbell
//

var package = require('../package.json')
var DEFAULT_MAX_TOPIC_STACK = 10
var TOPIC_STACK = []
var CURRENT_TOPIC = null
var MAIN_TOPIC_ID = "main"
var START_TOPIC_EVENT = "start_topic"

function createTopicHear(bp) {
    return function (condition, callback) {
        condition.topic = identifier
        bp.hear(condition, callback)
    }
}

function wrapBotHear(hearMethod) {
    return function(condition, callback) {

        if (!condition.topic) {
            condition.topic = MAIN_TOPIC
        }

        hearMethod(condition, callback)
    }
}

function createTopic(identifier, constructor) {
    var topic = {
        id: identifier,
        hear: createTopicHear(bp)
    }

    constructor(topic)

    return identifier
}

function startTopic(identifier, event) {

    if (TOPIC_STACK.length > DEFAULT_MAX_TOPIC_STACK) {
        TOPIC_STACK.shift()
    }

    if (CURRENT_TOPIC) {
        TOPIC_STACK.push(CURRENT_TOPIC)
    }
    
    CURRENT_TOPIC = identifier
    emitStartTopic(bp, event)
}

function returnToMainTopic(event) {
    TOPIC_STACK = []
    CURRENT_TOPIC = MAIN_TOPIC_ID
    emitStartTopic(bp, event)
}

function endTopic(event) {
    if (TOPIC_STACK.length > 0) {
        CURRENT_TOPIC = TOPIC_STACK.pop()
        emitStartTopic(bp, event)
    } else {
        // This shouldn't happen
        // but incase it does take the bot back
        // to the main topic
        bp.returnToMainTopic()
    }
}

function emitStartTopic(bp, event) {
    bp.middlewares.sendIncoming(Object.assign({}, event, {
        topic: CURRENT_TOPIC,
        platform: event.platform,
        type: 'start_topic',
        user: event.user,
        text: CURRENT_TOPIC,
        raw: CURRENT_TOPIC
    }))
}

function incomingMiddleware(event, next) {

    if (!CURRENT_TOPIC) {
        bp.returnToMainTopic(event)
    }

    event.topic = CURRENT_TOPIC
    next()
}

function startTopics(bp) {

    bp.middlewares.register({
        name: 'topics',
        type: 'incoming',
        order: 100,
        handler: incomingMiddleware,
        module: package.name,
        description: 'Middleware for Topics'
    })

    // Register all of the methods for this Module
    bp.createTopic = createTopic
    bp.startTopic = startTopic
    bp.endTopic = endTopic
    bp.returnToRootTopic = returnToRootTopic

    // We wrap the original hear method so that
    // it defaults to listening to the "main" topic
    bp.hear = wrapBotHear(bp.hear)    
}

module.exports = {
    config: { },
    init: function(bp) {
        startTopics(bp)
    },
    ready: function(bp) {}
}

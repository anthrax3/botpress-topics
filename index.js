// This is the code for the Botpress Topic module based on Bottr's Topics
// Written by James Campbell
//

var package = require('../package.json')
var DEFAULT_MAX_TOPIC_STACK = 10
var KVS_CONTEXT_ID = 'topics'
var MAIN_TOPIC_ID = "main"
var START_TOPIC_EVENT = "start_topic"

function startTopics(bp) {

    // This method wraps the original bot hear method
    // with one that makes sure all listeners default
    // to the "Main" topic. This will probably go
    // away once integrated into the core.
    //
    function _wrapBotHear(hearMethod) {
        return function(condition, callback) {

            if (!condition.topic) {
                condition.topic = MAIN_TOPIC
            }

            hearMethod(condition, callback)
        }
    }

    // This method creates a topic. It takes both an
    // identifier and constructor.
    //
    // The constructor will be called and passed in a
    // topic object.
    //
    // This function will return the identifier for 
    // bot to use to start this topic with.
    //
    function createTopic(identifier, constructor) {

        // Create an object for the topic
        // with an identifier and a hear method
        // with creates listeners for the current topic
        var topic = {
            id: identifier,
            hear: function (condition, callback) {
                condition.topic = identifier
                bp.hear(condition, callback)
            }
        }

        constructor(topic)

        return identifier
    }

    // This method start's a topic.
    // 
    // This method takes
    // the identifier of the topic to start and
    // the event it was started from.
    //
    function startTopic(identifier, event) {

        updateTopicContext(context => {
            context.stack.push(context.topic)
            context.topic = identifier
            _emitStartTopic(identifier, event)
        })
    }

    // This method returns to the main topic
    // and clear's the topic stack.
    // 
    // This method takes the event it was started from.
    //
    function returnToMainTopic(event) {
        
        updateTopicContext(context => {
            _resetContext(context, event)
        })
    }

    // This method goes to the last started topic
    // in the topic stack.
    // 
    // This method takes the event it was started from.
    //
    function endTopic(event) {

        updateTopicContext(context => {

            if (context.stack.length > 0) {
                context.topic = context.stack.pop()
                _emitStartTopic(context.topic, event)

            } else {
                // This shouldn't happen
                // but incase it does take the bot back
                // to the main topic
                _resetContext(context, event)
            }
        })
    }

    // Internal method for resetting the
    // context back to it's initial state
    //
    function _resetContext(event) {
        context.stack = []
        context.topic = MAIN_TOPIC_ID
        _emitStartTopic(MAIN_TOPIC_ID, event)
    }

    // Fetches the current topic context from the
    // Key value store and passes it to the context
    // to update it.
    //
    // Once done this function will save it
    //
    function updateTopicContext(callback) {

        var userIdentifier = (event.user && event.user.id) || event.raw.from

        bp.db.kvs.get(KVS_CONTEXT_ID, userIdentifier).then(context => {

            if (!context.stack) {
                context.stack = []
            }

            if (context.stack.length > DEFAULT_MAX_TOPIC_STACK) {
                context.stack.shift()
            }

            callback(context)
            bp.kvs.set(KVS_CONTEXT_ID, context)
        })
    }

    // This emits the start_topic event
    // when a topic is started or returned
    // to.
    //
    // We try to preserve any properties the calling
    // logic added to the event the topic was started from.
    //
    // But overwrite all the properties needed to let the
    // code know this is a start_topic event
    //
    function _setCurr_emitStartTopicentTopic(identifier, event) {
        bp.middlewares.sendIncoming(Object.assign({}, event, {
            topic: identifier,
            platform: event.platform,
            type: 'start_topic',
            user: event.user,
            text: identifier,
            raw: identifier
        }))
    }

    // The main middlewear code.
    //
    // If we don't have a topic make sure we return
    // to the 'main' topic.
    //
    // Then inject the current topic into the 
    // event object
    //
    function _incomingMiddleware(event, next) {
        updateTopicContext(context => {

            if (!context.topic) {
                bp.returnToMainTopic(event)
            }

            event.topic = context.topic
            next()
        })
    }

    bp.middlewares.register({
        name: 'topics',
        type: 'incoming',
        order: 100,
        handler: _incomingMiddleware,
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
    bp.hear = _wrapBotHear(bp.hear)    
}

module.exports = {
    config: { },
    init: function(bp) {
        startTopics(bp)
    },
    ready: function(bp) {}
}

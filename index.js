// This is the code for the Botpress Topic module based on Bottr's Topics
// Written by James Campbell
//

var DEFAULT_MAX_TOPIC_STACK = 10
var KVS_CONTEXT_ID = 'botpress_topics'
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
                condition.topic = MAIN_TOPIC_ID
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
    function startTopic(identifier, event, payload) {

        updateTopicContext(event, context => {
            context.stack.push(context.topic)
            context.topic = identifier
            
        }, context => {
            _emitStartTopic(identifier, event, payload)
        })
    }

    // This method returns to the main topic
    // and clear's the topic stack.
    // 
    // This method takes the event it was started from.
    //
    function returnToMainTopic(event, payload) {
        
        updateTopicContext(event, context => {
            _resetContext(context, event, payload)
        }, context => {
            _emitStartTopic(context.topic, event, payload)
        })
    }

    // This method goes to the last started topic
    // in the topic stack.
    // 
    // This method takes the event it was started from.
    //
    function endTopic(event, payload) {

        updateTopicContext(event, context => {

            if (context.stack.length > 0) {
                context.topic = context.stack.pop()
            } else {
                // This shouldn't happen
                // but incase it does take the bot back
                // to the main topic
                _resetContext(context, event, payload)
            }
        }, context => {
            _emitStartTopic(context.topic, event, payload)
        })
    }

    // Internal method for resetting the
    // context back to it's initial state
    //
    function _resetContext(context, event, payload) {
        context.stack = []
        context.topic = MAIN_TOPIC_ID
    }

    // Fetches the current topic context from the
    // Key value store and passes it to the context
    // to update it.
    //
    // Once done this function will save it
    //
    function updateTopicContext(event, update, done) {

        var userIdentifier = (event.user && event.user.id) || event.raw.from

        bp.db.kvs.get(KVS_CONTEXT_ID, userIdentifier).then(raw_context => {

            if (!raw_context) {
                context = {
                    stack: [],
                    topic: MAIN_TOPIC_ID
                }
            } else {
                context = JSON.parse(raw_context)
            }

            update(context)

            if (context.stack.length > DEFAULT_MAX_TOPIC_STACK) {
                context.stack.shift()
            }

            if (!context.topic) {
                context.topic = MAIN_TOPIC_ID
            }

            bp.db.kvs.set(KVS_CONTEXT_ID, JSON.stringify(context), userIdentifier).then(raw_context => {
                
                if (done) {
                    done(JSON.parse(raw_context))
                }
            })
        })
    }

    // This emits the start_topic event
    // when a topic is started or returned
    // to.
    //
    // We allow the calling topic to pass data to the next topic
    // via the payload option
    //
    function _emitStartTopic(identifier, event, payload) {
        bp.middlewares.sendIncoming({
            topic: identifier,
            platform: event.platform,
            type: 'start_topic',
            user: event.user,
            from: event.from,
            text: identifier,
            raw: payload || {}
        })
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

        console.log(JSON.stringify(event))

        updateTopicContext(event, context => {
            event.topic = context.topic
            next()
        })
    }

    bp.middlewares.register({
        name: 'topics',
        type: 'incoming',
        order: 100,
        handler: _incomingMiddleware,
        module: 'botpress-topics',
        description: 'Middleware for Topics'
    })

    // Register all of the methods for this Module
    bp.createTopic = createTopic
    bp.startTopic = startTopic
    bp.endTopic = endTopic
    bp.returnToMainTopic = returnToMainTopic

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

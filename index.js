
// Example of threading system based on Bottr's Topics
module.exports = {
    config: { },
    init: function(bp) {

        var threadStack = []
        var currentThread = null
        var ROOT_THREAD_ID = "root"

        function emitThreadEnter(bp, event) {

            console.log("Sending enter_thread for " + currentThread + " thread")

            bp.middlewares.sendIncoming({
                thread: currentThread,
                platform: event.platform,
                type: 'enter_thread',
                user: event.user,
                text: currentThread,
                raw: currentThread
            })
        }

        var incomingMiddleware = function(event, next) {

            if (!currentThread) {
                bp.popToRootThread(event)
            }

            event.thread = currentThread
            console.log(event.type + " event received for " + event.thread + " thread")

            next()
        }

        bp.middlewares.register({
            name: 'threads', // friendly name
            type: 'incoming', // either incoming or outgoing
            order: 100, // arbitrary number
            handler: incomingMiddleware, // the middleware function
            module: 'botpress-cfm', // the name of the module, if any
            description: 'Adds basic thread and conversation management'
        })

        bp.restartThread = function(event) {
            emitThreadEnter(bp, event)
        }

        // In production it may be nice to throw an error if two threads have the same name
        bp.createThread = function(identifier, constructor) {
            
            var thread = {
                id: identifier,
                hear: function(condition, callback) {
                    condition.thread = identifier
                    bp.hear(condition, callback)
                }
            }

            constructor(thread)

            return identifier
        }

        bp.pushThread = function(identifier, event) {

            console.log("Pushing " + identifier + " thread")

            if (currentThread) {
                threadStack.push(currentThread)
            }
            
            currentThread = identifier
            emitThreadEnter(bp, event)
        }

        bp.popThread = function(event) {

            if (threadStack.length > 0) {
                console.log("Popping " + currentThread + " thread")
                currentThread = threadStack.pop()
                emitThreadEnter(bp, event)
            }
        }

        bp.popToRootThread = function(event) {

            console.log("Popping to root")

            threadStack = []
            currentThread = ROOT_THREAD_ID
            emitThreadEnter(bp, event)
        }

        // Constant user can pass into hears to match any thread to have global handler
        bp.ANY_THREAD = /.+/ 

        var oldHear = bp.hear
        bp.hear = function(condition, callback) {

            // To have a global hears call the user needs to pass in { thread: bp.ANY_THREAD }
            if (!condition.thread) {
                condition.thread = ROOT_THREAD_ID
            }

            oldHear(condition, callback)
        }

        //TODO: Make overridable componenet - this should be focused on lower-level threads? 
        //
        // High level function which defines thread which ask questions and will go
        // down code path a if answer matches or b if it doesnt
        //
        // if it matches it will pop the thread stack back to where user was
        //
        // if it doesn't it will restart thread so they are re-asked the question
        //
        bp.createQuestion = function(question, matcher, match, notmatch) {
            return bp.createThread(question, thread => {

                thread.hear({
                    type: 'enter_thread'
                }, event => {
                    // Normally we would use the more genric method but since this is a prototype YOLO
                    bp.messenger.sendText(event.user.id, question)
                })

                // Because of the differences between Bottr and Botpress a match won't stop
                // later hear blocks from being called, so we specify it to prevent it from
                // being called automatically
                //
                // We should fix this behaviour in botpress
                //
                thread.hear({
                    type: 'message',
                    text: matcher
                }, (event, next) => {
                    event.answer = event.text
                    match(event)
                    bp.popThread(event) 
                })

                thread.hear({
                    type: 'message',
                    text: /.+/
                }, event => {
                    notmatch(event)
                    bp.restartThread(event)
                })
            })
        }

        //TODO: Make overridable componenet - this should be focused on lower-level threads? 
        // 
        // This creates a thread which will present a form or a queue of questions
        // 
        // Everytime this thread is entered it will as kthe next question
        // it will push the thread of each question onto the stack
        //
        // when the question is answered it will pop triggering this thread to be entered
        // causing it to then ask the next question
        //
        // once its out of questions it will pop the thread stack returning the bot
        // to the original thread it came from
        //
        // 
        bp.createQuestionQueue = function(identifier, questions) {
            return bp.createThread(identifier, thread => {

                var questionIndex = -1
                
                thread.hear({
                    type: 'enter_thread'
                }, event => {

                    var shouldAskQuestion = true

                    // we should not be asking a question
                    // if we have asked at least one question
                    // and we didn't get an answer (i.e the question thread was popped before we
                    // got an answer)
                    if (questionIndex > -1 && !event.answer) {
                        shouldAskQuestion = false
                    }

                    questionIndex ++

                    if (shouldAskQuestion && identifier.length > questionIndex) {
                        // If we should be asking a question and we have more questions
                        // start the next question
                        bp.pushThread(questions[questionIndex])
                    } else {
                        // otherwise reset the queue and pop the thread
                        questionIndex = -1
                        bp.popThread()
                    }
                })
            })
        }
    },
    ready: function(bp) {}
}


module.exports = function(bp) {
  bp.middlewares.load()
  var count = 0
  
  bp.hear({
    type: 'message',
    thread: bp.ANY_THREAD,
    text: 'root'
  }, (event, next) => {
      count = 0
      bp.popToRootThread(event)
  })

  var ASK_THREAD_ID = "ask" // See below

  bp.hear({
      type: 'message',
      thread: bp.ANY_THREAD,
      text: 'back'
  }, (event, next) => {

      console.log("Heard the user wanted to go back so popping thread")

      if (event.thread == ASK_THREAD_ID) {
        //TODO: We could have a leave thread event to allow
        // clean up to happen and to avoid code like this
        count --
      }
      
      bp.popThread(event)
  })

  var questionThread = bp.createQuestion("How old are you ?", /\d+/, event => {
     bp.messenger.sendText(event.user.id, "You don't look half bad")
  }, event =>{
     bp.messenger.sendText(event.user.id, "Last time I checked an age was a number")
  })

  var questionThread2 = bp.createQuestion("How many toes do you have ?", /\d+/, event => {
     bp.messenger.sendText(event.user.id, "That's alot of toes")
  }, event =>{
     bp.messenger.sendText(event.user.id, "Last time I checked an number of toes was a number")
  })

  var formThread = bp.createQuestionQueue("signupForm", [questionThread, questionThread2])

  var askThread = bp.createThread(ASK_THREAD_ID, thread => {
    thread.hear({
      type: 'enter_thread'
    }, event => {
       bp.messenger.sendText(event.user.id, count.toString())
    })
    thread.hear({
      text: 'question'
    }, event => {
       bp.pushThread(questionThread, event)
    })
    thread.hear({
      text: 'queue'
    }, event => {
       bp.pushThread(formThread, event)
    })
    thread.hear({
      text: 'next'
    }, event => {
       count ++;
       bp.pushThread(thread.id, event)
    })
  })

  bp.hear({
    type: 'postback',
    text: 'GET_STARTED'
  }, event => {
    count ++;
    bp.pushThread(askThread, event)
  })
  bp.hear({
    type: 'message',
    text: /.+/
  }, (event, next) => {
      bp.messenger.sendText(event.user.id, "you popped to root so I won't do anything now ")
  })
}
// module.exports = function(bp) {
//   bp.middlewares.load()

//   bp.hear({
//     type: 'postback',
//     text: 'GET_STARTED'
//   }, event => {

//     bp.messenger.sendText(event.user.id, "WAIT. Now what was I going to tell you....", {waitDelivery: true}).then(function(){
//       return bp.messenger.sendText(event.user.id, "Ah yes, now I remember", {waitDelivery: true})
//     }).then(function(){
//       return bp.messenger.sendText(event.user.id, "I'm RememberBot", {waitDelivery: true})
//     }).then(function(){
//       return bp.messenger.sendText(event.user.id, "Just message me with \'remind me to' followed by what you are trying to remember", {waitDelivery: true})
//     }).then(function(){
//       return bp.messenger.sendText(event.user.id, "then I'll try my best to remind 💡 you about it 😀", {waitDelivery: true})
//     })
//   })

//   var remind_regexr =  /remind me to (.+)/

//   bp.hear({
//     type: 'message',
//     text: remind_regexr
//   }, event => {
//       var match = remind_regexr.exec(event.text);
//       bp.messenger.sendText(event.user.id, "Don't worry I will remind you to " + match[1] + ", send 'list' to see what you have got left to do!")
//   })

//   bp.hear({
//     type: 'message',
//     text: /list/
//   }, event => {
//       var match = remind_regexr.exec(event.text);
//       bp.messenger.sendText(event.user.id, "Don't worry I will remind you to " + match[1] + ", !")
//   })
// }

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

  bp.hear({
      type: 'message',
      thread: bp.ANY_THREAD,
      text: 'back'
  }, event => {
      count --
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

  var askThread = bp.createThread("ask", thread => {
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
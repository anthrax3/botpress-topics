module.exports = function(bp) {
  bp.middlewares.load()

  var enterLocation = bp.createQuestion('Please share or type your location', /.+/, event => {}, event => {
    bp.messenger.sendText(event.user.id, "Sorry I don't understand that location")
  })

  var detailsThread = bp.createThread('details', thread => {
    thread.hear({
      type: 'enter_thread'
    }, event => {
      bp.messenger.sendText(event.user.id, 'Opens at 8am, closes at 10pm. Opened right now.')
    })

    thread.hear({
      text: 'tommorow'
    }, event => {
      bp.messenger.sendText(event.user.id, 'Tomorrow it opens at 10am')
    })
  })

  var searchThread = bp.createThread('search', thread => {

    var type_regexr = /show only (.+)/
    var distance_regexr = /make it (.+)/
    var more_details_postback = 'MORE_DETAILS'

    thread.hear({
      type: 'enter_thread'
    }, event => {

      thread.location = event.location
      thread.type = event.type
      thread.distance = event.distance

      var text = "Here’s some "

      if (thread.type) {
        text += thread.type + " "
      }

      if (thread.distance) {
        text += "restaurants around " + thread.distance + " " + thread.location
      } else {
        text += "restaurants near " + thread.location
      }

      bp.messenger.sendTemplate(event.user.id, {
        template_type: 'button',
        text: text,
        buttons: [{ 
          type: 'postback',
          title: 'More Details',
          payload: more_details_postback
        }]
      })
    })

    thread.hear({
      text: type_regexr
    }, event => {
      var type = type_regexr.exec(event.text)[1]

      event.location = thread.location
      event.type = type
      event.distance = thread.distance

      bp.pushThread(thread.id, event)
    })

    thread.hear({
      text: distance_regexr
    }, event => {
      var distance = type_regexr.exec(event.text)[1]

      event.location = thread.location
      event.type = thread.type
      event.distance = distance

      bp.pushThread(thread.id, event)
    })

    thread.hear({
      type: 'postback',
      text: more_details_postback
    }), event => {
      bp.pushThread(detailsThread, event)
    }
  })

  bp.hear({
    thread: bp.ANY_THREAD,
    text: 'resturants nearby'
  }, event => {
    bp.popToRootThread(event)
  })

  bp.hear({
    thread: bp.ANY_THREAD,
    text: 'thanks'
  }, event => {
    bp.messenger.sendText(event.user.id, "You're welcome")
  })

  bp.hear({
    type: 'enter_thread'
  }, event => {

    // If we are resuming this thread as we got an answer
    // then lets carry on
    if (event.answer) {

      event.location = event.answer
      bp.pushThread(searchThread, event)

    } else {
      bp.pushThread(enterLocation, event)
    }
  })

  //TODO: "Mexican restaurant" and "Actually show my italian restaurants again"
}
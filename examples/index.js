module.exports = function(bp) {
  bp.middlewares.load()

  // TODO: Handle expiring older threads
  // TODO: Handle user retreving old results

  var searchThread = bp.createThread('search', thread => {

    var more_details_postback = 'MORE_DETAILS'

    thread.hear({
      type: 'enter_thread'
    }, event => {

      thread.location = event.location
      thread.location_type = event.location_type
      thread.distance = event.distance

      var text = "Here’s some "

      if (thread.location_type) {
        text += thread.location_type + " "
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

  var askLocation = bp.createQuestion('Please share or type your location', /.+/, event => {
    bp.pushThread(searchThread) 
  }, event => {
    bp.messenger.sendText(event.user.id, "Sorry I don't understand that location")
  })

  // In the beggining take user to the search
  bp.hear({
      'type': 'postback',
      'text': 'GET_STARTED'
  }, event => {
    bp.pushThread(askLocation, event)
  })

  // Allow user to trigger search from anywhere
  bp.hear({
    thread: bp.ANY_THREAD,
    'nlp.action': 'search'
  }, event => {
    bp.pushThread(askLocation, event)
  })

  var detailsThread = bp.createThread('details', thread => {

      thread.hear({
        type: 'enter_thread'
      }, event => {
        bp.messenger.sendText(event.user.id, 'Opens at 8am, closes at 10pm. Opened right now.')
      })

      thread.hear({
        'nlp.action': 'tommorow'
      }, event => {
        bp.messenger.sendText(event.user.id, 'Tomorrow it opens at 10am')
      })
    })

    thread.hear({
      'nlp.action': 'type'
    }, event => {
      var type = type_regexr.exec(event.text)[1]

      event.location = thread.location
      event.location_type = type
      event.distance = thread.distance

      bp.pushThread(thread.id, event)
    })

    thread.hear({
      'nlp.action': 'distance'
    }, event => {
      var distance = distance_regexr.exec(event.text)[1]

      event.location = thread.location
      event.location_type = thread.location_type
      event.distance = distance

      bp.pushThread(thread.id, event)
    })

    thread.hear({
      type: 'postback',
      text: more_details_postback
    }, event => {
      bp.pushThread(detailsThread, event)
    })
  })
}
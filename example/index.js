module.exports = function(bp) {
  bp.middlewares.load()

  var searchTopic = bp.createTopic('search', topic => {

    var more_details_postback = 'MORE_DETAILS'

    topic.hear({
      type: 'start_topic'
    }, event => {

      topic.location = event.location
      topic.location_type = event.location_type
      topic.distance = event.distance

      var text = "Here’s some "

      if (topic.location_type) {
        text += topic.location_type + " "
      }

      if (topic.distance) {
        text += "restaurants around " + topic.distance + " " + topic.location
      } else {
        text += "restaurants near " + topic.location
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

  var askLocation = bp.createTopic('location', topic => {

    topic.hear({
        type: 'start_topic'
    }, event => {
      bp.messenger.sendText(event.user.id, 'Please enter or share your location', {
        quick_replies: [
         { title: "location", content_type: "location" } // Workaround Botpress expecting title
        ]
      })
    })

    topic.hear({
      type: 'location'
    }, event => {
      var attachment = event.message.attachments[0].payload
      event.location = attachment.title
      bp.startTopic(searchTopic, event) 
    })

    topic.hear({
      type: 'message',
      text: /.+/
    }, event => {
      event.location = event.text
      bp.startTopic(searchTopic, event) 
    })
  })

  // In the beggining take user to the search
  bp.hear({
      'type': 'postback',
      'text': 'GET_STARTED'
  }, event => {
    bp.startTopic(askLocation, event)
  })

  // Allow user to trigger search from anywhere
  bp.hear({
    topic: /.+/,
    'nlp.action': 'search'
  }, event => {
    bp.startTopic(askLocation, event)
  })

  bp.hear({
    topic: /.+/,
    text: 'back'
  }, event => {
    bp.endTopic(event)
  })

  var detailsTopic = bp.createTopic('details', topic => {

      topic.hear({
        type: 'start_topic'
      }, event => {
        bp.messenger.sendText(event.user.id, 'Opens at 8am, closes at 10pm. Opened right now.')
      })

      topic.hear({
        'nlp.action': 'tommorow'
      }, event => {
        bp.messenger.sendText(event.user.id, 'Tomorrow it opens at 10am')
      })
    })

    topic.hear({
      'nlp.action': 'type'
    }, event => {
      var type = type_regexr.exec(event.text)[1]

      event.location = topic.location
      event.location_type = type
      event.distance = topic.distance

      bp.startTopic(topic.id, event)
    })

    topic.hear({
      'nlp.action': 'distance'
    }, event => {
      var distance = distance_regexr.exec(event.text)[1]

      event.location = topic.location
      event.location_type = topic.location_type
      event.distance = distance

      bp.startTopic(topic.id, event)
    })

    topic.hear({
      type: 'postback',
      text: more_details_postback
    }, event => {
      bp.startTopic(detailsTopic, event)
    })
  })
}
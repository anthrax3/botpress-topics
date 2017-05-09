# Botpress Topics

This module adds Topics to your Bot. Topics are reusable
pieces of dialogue for a conversation. 

These allow your bot to focus on a specific concept in a
conversation allowing the user to respond contextually to something
the bot has just said i.e when a bot asks a question or sends a search result.

## Basics

To create topic, use the `createTopic` method on your botpress instance:

```
var topic = bp.createTopic('topic-name', topic => {

})
```

This method takes a string for the topic's identifier and a callback
method to configure it. The method will return the identifier for the
topic which you will need later.

To start a topic just use the `startTopic` method, this will
start the topic causing a `start_topic` event to be emitted.

To end a topic just use the `endTopic` method, this will
go to the previous topic causing a `start_topic` event to be emitted.

Your top level `hear` methods belong to the `main` topic, you can
go back to them by using the `returnToMainTopic` this will end any
currently started topics.

If you want to have your bot listen to certain global actions by the user
you can tell the bot to listen to something across all topics like so:

```
hear({
    topic: /.+/
}, ...)
```

## Example

```
var ageTopic = bp.createTopic('topic-name', topic => {

    topic.hear({
        type: 'start_topic'
    }, event => {
      bp.messenger.sendText(event.user.id, 'Whats your age ?')
    })

    topic.hear({
      type: 'message',
      text: /\d/
    }, event => {
      event.age = event.text
      bp.endTopic(event)
    })

    topic.hear({
      type: 'message',
      text: /.+/
    }, event => {
      bp.messenger.sendText(event.user.id, 'That doesn't look like a number to me ?')
    })
})

bp.hear({
    type: 'start_topic'
}, event => {
    if (event.age >= 50) {
        bp.messenger.sendText(event.user.id, 'You don't look a day over !')
    } else if (event.age < 50) {
        bp.messenger.sendText(event.user.id, 'Act your age not your shoe size !')
    }
})

bp.hear({
    type: 'postback',
    text: 'GET_STARTED'
}, event => {
    bp.startTopic(ageTopic, event)
})

```

In this example when the user presses get started, we ask for their age and wait for their response.
If they don't type a correct age we send a message. when we eventually get an age, we return to bot back
to what it was originally doing and send a message depending on their answer.

## Note

Please make sure on the middleware screen the middleware for this module is before the `hear` middlewear.
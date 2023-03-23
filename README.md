<p align="center">
 <img src="https://raw.githubusercontent.com/opentitles/client/master/images/header.png")/>
 <i>See https://opentitles.info/ for download links and more information.</i>
</p>

# OpenTitles Scraper
This component iterates all the RSS feeds defined in the shared [OpenTitles definition](https://github.com/opentitles/definition) and saves them to a MongoDB instance.

## Environment

Below are all the environment variables that the scraper picks up with the corresponding defaults.

```conf
# Connection string for the RabbitMQ exchange
RABBITMQ_URL=amqp://127.0.0.1
# Connection string for the MongoDB host
MONGO_URL=mongodb://127.0.0.1:27017
# Database name for the production database
MONGO_DB_PROD=opentitles
# Database name for the test/local database
MONGO_DB_TEST=opentitlestest
# Port to listen on
PORT=8083
# Notifier type to use, one of 'null', ' pubsub' or 'webhook'
NOTIFIER=pubsub
# JSON-encoded array of webhook listeners.
WEBHOOK_LISTENERS="[]"
```

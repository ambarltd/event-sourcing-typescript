# Event Sourcing - Typescript

This repository contains a starter pack for **Event Sourcing in Typescript.** It is a production grade starting point 
for your own event sourced application. The starter pack has everything you need to get started with event sourcing, 
including an event store, a projection store, and an event bus.

This starter pack implements a simple example for a Cooking Club Membership. But you're meant to replace this example
with your own application.

## Getting Started

To run this application you need Docker. Once you have Docker installed, please clone the code,
navigate to the `local-developments/scripts` folder.

```bash
git clone git@github.com:ambarltd/event-sourcing-typescript.git
cd event-sourcing-typescript/local-development/scripts/linux # if you're on linux
cd event-sourcing-typescript/local-development/scripts/mac # if you're on mac
./dev_start.sh # start docker containers
./dev_demo.sh # run demo
```

You can then open your browser to:
- [http://localhost:8080](http://localhost:8080) to ping the backend
- [http://localhost:8081](http://localhost:8081) to view your event store
- [http://localhost:8082](http://localhost:8082) to view your projection store

## How to Develop Your Own Application

1. To use your own aggregates, events, commands, queries, projections, and reactions, you will need to change the code 
in `src/domain/`.
2. To register any services you add (controllers, repositories, etc.) you will need to change the container definition
code in `src/di/container.ts`.
3. To register new routes, you will need to register your controllers in `src/index.ts`.
4. If you added new events, you need to update the `Serializer` and `Deserializer` classes in 
`src/common/serializedEvent/`.

## Additional Scripts

Whenever you build a new feature, you might want to restart the application, or even delete the event store and projection
store. We have provided scripts to help you with that.

```bash
cd event-sourcing-typescript/local-development/scripts/linux # if you're on linux
cd event-sourcing-typescript/local-development/scripts/mac # if you're on mac
./dev_start.sh # starts / restarts the application.
./dev_start_with_data_deletion.sh # use this if you want to delete your existing event store, and projection db, and restart fresh.
./dev_shutdown.sh # stops the application
```

## Deployment

To deploy this application to a production environment, you will simply need to build the code into a docker image,
and deploy it to your cloud provider. We have provided infrastructure starter packs for various clouds in [this repository](https://github.com/ambarltd/event-sourcing-cloud-starter-packs).

## Support

If you get stuck, please ask us questions in the #event-sourcing channel of our Slack community.
If you're not part of our Slack, please sign up [here](https://www.launchpass.com/ambar).
Or if you'd like a free private walkthrough, simply book one [here](https://calendly.com/luis-ambar).


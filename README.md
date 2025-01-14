# Event Sourcing - Typescript

This repository contains a starter pack for **Event Sourcing in Typescript.** It is a production grade starting point 
for your own event sourced application. The starter pack has everything you need to get started with event sourcing, 
including an event store, a projection store, and an event bus.

This starter pack implements a simple example for a Cooking Club Membership. But you're meant to replace this example
with your own application. 

## Getting Started

To run this application you need Docker. Once you have Docker installed, please clone the code,
navigate to the `local-development/scripts` folder.

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

Assuming you know event sourcing theory, developing on this application will feel very natural. Otherwise, don't worry - Ambar offers a **free** 1 day Event Sourcing course [here](https://ambar.cloud/event-sourcing-one-day-course). 

To get a quick understanding of how this application works, please read the domain code in `src/domain/`, the abstractions provided in `src/common/`, and the README files also in `src/common/`. With that reading done, here's a full picture:

1. `src/domain/`: where you define aggregates, events, commands, queries, projections, and reactions. You will spend most of your time here.
2. `src/common/`: a set of event sourcing abstractions. You will rarely need to edit files here, except for having to update the `Serializer` and `Deserializer` classes in `src/common/serializedEvent/` whenever you add or remove events.
3. `src/di/container.ts`: contains a dependency injection container. You will need to edit this file to register or unregister services as you see fit (controllers, repositories, etc.). 
4. `src/index.ts`: contains the application's startup file. You will need to register routes, and their associated controllers here.

When developing your application for the fist time, we recommend you keep the Cooking Club Membership code as an example you can quickly navigate to. Once you have implemented several commands, queries, projections, and reactions, delete the Cooking Club Membership code. This will require you to delete its code in `src/domain`, serialization logic in `src/common/serializedEvent`, relevant services in `src/di/container.ts`, and any routes in `src/index.ts`.

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

If you get stuck, please feel free to ask questions in the #event-sourcing channel of our [Slack community](https://www.launchpass.com/ambar). 
Or if you need further help like a free private walkthrough, simply book one [here](https://calendly.com/luis-ambar).


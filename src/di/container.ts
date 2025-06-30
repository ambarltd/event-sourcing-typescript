import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { PostgresConnectionPool } from "../common/util/PostgresConnectionPool";
import { MongoSessionPool } from "../common/util/MongoSessionPool";
import { Deserializer } from "../common/serializedEvent/Deserializer";
import { Serializer } from "../common/serializedEvent/Serializer";
import { MetadataAutoSerializer } from "../common/serialization";
import { PostgresTransactionalEventStore } from "../common/eventStore/PostgresTransactionalEventStore";
import { MongoTransactionalProjectionOperator } from "../common/projection/MongoTransactionalProjectionOperator";
import { constructor } from "tsyringe/dist/typings/types";
import {MongoInitializer} from "../common/util/MongoInitializer";
import {PostgresInitializer} from "../common/util/PostgresInitializer";
import {
    SubmitApplicationCommandController
} from "../domain/cookingClub/membership/command/submitApplication/SubmitApplicationCommandController";
import {
    SubmitApplicationCommandHandler
} from "../domain/cookingClub/membership/command/submitApplication/SubmitApplicationCommandHandler";
import {
    EvaluateApplicationReactionHandler
} from "../domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionHandler";
import {
    EvaluateApplicationReactionController
} from "../domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionController";
import {
    MembersByCuisineProjectionHandler
} from "../domain/cookingClub/membership/projection/membersByCuisine/MembersByCuisineProjectionHandler";
import {
    MembershipApplicationRepository
} from "../domain/cookingClub/membership/projection/membersByCuisine/MembershipApplicationRepository";
import {CuisineRepository} from "../domain/cookingClub/membership/projection/membersByCuisine/CuisineRepository";

function registerEnvironmentVariables() {
    const postgresConnectionString =
        `postgresql://${getEnvVar("EVENT_STORE_USER")}:${getEnvVar("EVENT_STORE_PASSWORD")}@` +
        `${getEnvVar("EVENT_STORE_HOST")}:${getEnvVar("EVENT_STORE_PORT")}/` +
        `${getEnvVar("EVENT_STORE_DATABASE_NAME")}`;
    container.register("postgresConnectionString", { useValue: postgresConnectionString });
    container.register("eventStoreTable", { useValue: getEnvVar('EVENT_STORE_CREATE_TABLE_WITH_NAME')});
    container.register("eventStoreDatabaseName", {useValue: getEnvVar('EVENT_STORE_DATABASE_NAME')});
    container.register("eventStoreCreateReplicationUserWithUsername", { useValue: getEnvVar('EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME')});
    container.register("eventStoreCreateReplicationUserWithPassword", { useValue: getEnvVar('EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD')});
    container.register("eventStoreCreateReplicationPublication", {useValue: getEnvVar('EVENT_STORE_CREATE_REPLICATION_PUBLICATION')});

    const mongoConnectionString =
        `mongodb://${getEnvVar("MONGODB_PROJECTION_DATABASE_USERNAME")}:${getEnvVar("MONGODB_PROJECTION_DATABASE_PASSWORD")}@` +
        `${getEnvVar("MONGODB_PROJECTION_HOST")}:${getEnvVar("MONGODB_PROJECTION_PORT")}/` +
        `${getEnvVar("MONGODB_PROJECTION_DATABASE_NAME")}` +
        "?serverSelectionTimeoutMS=10000&connectTimeoutMS=10000&authSource=admin";
    const mongoDatabaseName = getEnvVar("MONGODB_PROJECTION_DATABASE_NAME");
    container.register("mongoConnectionString", { useValue: mongoConnectionString });
    container.register("mongoDatabaseName", { useValue: mongoDatabaseName });
}

function registerSingletons() {
    // common/serializedEvent
    container.registerSingleton(Serializer);
    container.registerSingleton(Deserializer);
    container.registerSingleton(MetadataAutoSerializer);

    // common/util
    container.registerSingleton(PostgresConnectionPool);
    container.registerSingleton(MongoSessionPool);
    container.registerSingleton(MongoInitializer);
    container.registerSingleton(PostgresInitializer);
}

function registerScoped<T>(token: constructor<T>) {
    container.register(token, token, { lifecycle: Lifecycle.ContainerScoped });
}

function registerScopedServices() {
    // common/eventStore
    registerScoped(PostgresTransactionalEventStore);

    // common/projection
    registerScoped(MongoTransactionalProjectionOperator);

    // domain/cookingClub/command/submitApplication
    registerScoped(SubmitApplicationCommandController);
    registerScoped(SubmitApplicationCommandHandler);

    // domain/cookingClub/projection/membersByCuisine
    registerScoped(CuisineRepository);
    registerScoped(MembersByCuisineProjectionHandler);
    registerScoped(MembershipApplicationRepository);

    // domain/cookingClub/reaction/evaluateApplication
    registerScoped(EvaluateApplicationReactionController);
    registerScoped(EvaluateApplicationReactionHandler);
}

export function configureDependencies() {
    registerEnvironmentVariables();
    registerSingletons();
    registerScopedServices();
}

function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not defined`);
    }
    return value;
}
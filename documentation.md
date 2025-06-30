# Event Sourcing TypeScript - Complete Documentation

## Overview

This repository is a **production-grade starter pack for Event Sourcing in TypeScript**. It implements a complete event-sourced architecture with CQRS (Command Query Responsibility Segregation) patterns, using a Cooking Club Membership system as a reference implementation.

### Key Technologies

- **Backend**: Node.js with Express.js and TypeScript
- **Event Store**: PostgreSQL with logical replication
- **Projection Store**: MongoDB with replica sets
- **Event Streaming**: Ambar platform for event processing
- **Dependency Injection**: TSyringe
- **Validation**: Zod
- **Logging**: Winston
- **Development**: Docker Compose for local environment

## Architecture Overview

### Event Sourcing Fundamentals

This system implements **Event Sourcing**, where:

- **Events** are the single source of truth (immutable facts about what happened)
- **Current state** is derived by replaying events in order
- **Commands** express intent to change state
- **Projections** provide optimized read models
- **Reactions** handle side effects

### CQRS Pattern

The system separates **Command Side** (writes) from **Query Side** (reads):

- **Command Side**: Handles business logic, validates commands, generates events
- **Query Side**: Serves read requests from optimized projections
- **Event Bus**: Connects the two sides via asynchronous event processing

### System Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Commands  │───▶│  Aggregates  │───▶│   Events    │
│             │    │              │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Queries   │◀───│ Projections  │◀───│ Event Store │
│             │    │              │    │ (Postgres)  │
└─────────────┘    └──────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ Projection  │    │  Reactions  │
                   │ Store       │    │             │
                   │ (MongoDB)   │    └─────────────┘
                   └─────────────┘
```

## Project Structure

### Root Directory

```
event-sourcing-typescript/
├── src/                          # Source code
├── local-development/            # Development environment
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Setup instructions
└── Dockerfile                    # Container build
```

### Source Code Organization

```
src/
├── index.ts                      # Application entry point
├── di/                          # Dependency injection
│   ├── container.ts             # Service registration
│   └── scopedContainer.ts       # Request-scoped DI
├── common/                      # Event sourcing abstractions
│   ├── aggregate/               # Aggregate base classes
│   ├── command/                 # Command handling
│   ├── event/                   # Event definitions
│   ├── eventStore/              # Event persistence
│   ├── projection/              # Read model handling
│   ├── query/                   # Query processing
│   ├── reaction/                # Side effect handling
│   ├── serializedEvent/         # Event serialization
│   ├── ambar/                   # Ambar integration
│   └── util/                    # Utilities
└── domain/                      # Business domain
    └── cookingClub/             # Example domain
        └── membership/          # Membership context
            ├── aggregate/       # Business entities
            ├── command/         # Business operations
            ├── event/           # Domain events
            ├── projection/      # Read models
            ├── query/           # Data queries
            └── reaction/        # Business reactions
```

## Core Components

### 1. Events

**Purpose**: Immutable records of state changes that have occurred in the system.

**Location**: `src/common/event/`

**Key Classes**:

- `Event`: Base abstract class for all events
- `CreationEvent`: Events that create new aggregates
- `TransformationEvent`: Events that modify existing aggregates
- `SerializedEvent`: Database representation of events

**Properties**:

- `event_id`: Unique identifier
- `aggregate_id`: ID of the affected aggregate
- `aggregate_version`: Version number for optimistic locking
- `causation_id`: ID of the command that caused this event
- `correlation_id`: Groups related events across aggregates
- `recorded_on`: Timestamp
- `payload`: Event-specific data
- `metadata`: Additional context

### 2. Aggregates

**Purpose**: In-memory representations of current state, reconstructed from events.

**Location**: `src/common/aggregate/`

**Key Concepts**:

- **Aggregate Hydration**: Process of rebuilding state from events
- **Optimistic Locking**: Uses aggregate version for concurrency control
- **Immediate Consistency**: Aggregates provide consistent state for business logic

**Example** (`src/domain/cookingClub/membership/aggregate/membership.ts`):

```typescript
export class Membership extends Aggregate {
  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly status: MembershipStatus,
  ) {
    super(aggregateId, aggregateVersion);
  }
}
```

### 3. Commands

**Purpose**: Express intent to change system state.

**Location**: `src/common/command/`

**Key Classes**:

- `Command`: Base class for all commands
- `CommandHandler`: Processes commands and generates events
- `CommandController`: HTTP endpoints for commands

**Command Processing Flow**:

1. Receive command via HTTP
2. Validate command data
3. Load aggregate from event store
4. Apply business logic
5. Generate new events
6. Save events to store

### 4. Event Store

**Purpose**: Persistent storage for events with transactional guarantees.

**Location**: `src/common/eventStore/`

**Implementation**: PostgreSQL with logical replication

- **Table**: `event_store`
- **Serialization**: Events converted to `SerializedEvent` format
- **Transactions**: ACID guarantees for event persistence
- **Replication**: Supports real-time event streaming

### 5. Projections

**Purpose**: Optimized read models built from events.

**Location**: `src/common/projection/`

**Key Concepts**:

- **Eventually Consistent**: Updated asynchronously from events
- **Specialized Views**: Tailored for specific query patterns
- **MongoDB Storage**: Document-based for flexible querying
- **Idempotent Processing**: Handle duplicate events gracefully

**Processing Flow**:

1. Ambar streams events from PostgreSQL
2. `ProjectionController` receives HTTP requests
3. `ProjectionHandler` updates MongoDB collections
4. `ProjectedEvent` tracks processed events for idempotency

### 6. Queries

**Purpose**: Handle read requests against projections.

**Location**: `src/common/query/`

**Key Classes**:

- `Query`: Base class for query requests
- `QueryHandler`: Processes queries against projections
- `QueryController`: HTTP endpoints for queries

**Benefits**:

- **Performance**: Optimized read models
- **Scalability**: Separate scaling from write side
- **Flexibility**: Multiple views of same data

### 7. Reactions

**Purpose**: Handle side effects in response to events.

**Location**: `src/common/reaction/`

**Key Concepts**:

- **Idempotent**: Must handle duplicate processing
- **Event Recording**: Results recorded as new events
- **Deterministic IDs**: Enable idempotency checking

**Use Cases**:

- Send notifications
- Update external systems
- Trigger workflows
- Business rule enforcement

## Domain Implementation: Cooking Club Membership

### Business Context

The example domain implements a cooking club membership system where:

- Users submit membership applications
- Applications are automatically evaluated based on criteria
- Members are categorized by favorite cuisine

### Domain Structure

```
domain/cookingClub/membership/
├── aggregate/
│   └── membership.ts                    # Membership aggregate
├── command/
│   └── submitApplication/
│       ├── SubmitApplicationCommand.ts          # Command definition
│       ├── SubmitApplicationCommandHandler.ts  # Business logic
│       └── SubmitApplicationCommandController.ts # HTTP endpoint
├── event/
│   ├── ApplicationSubmitted.ts         # Creation event
│   └── ApplicationEvaluated.ts         # Transformation event
├── projection/
│   └── membersByCuisine/
│       ├── MembersByCuisineProjectionHandler.ts    # Projection logic
│       ├── MembersByCuisineProjectionController.ts # HTTP endpoint
│       ├── MembershipApplicationRepository.ts     # Data access
│       ├── CuisineRepository.ts                  # Data access
│       ├── MembershipApplication.ts              # Read model
│       └── Cuisine.ts                           # Read model
├── query/
│   └── membersByCuisine/
│       ├── MembersByCuisineQuery.ts           # Query definition
│       ├── MembersByCuisineQueryHandler.ts    # Query logic
│       └── MembersByCuisineQueryController.ts # HTTP endpoint
└── reaction/
    └── evaluateApplication/
        ├── EvaluateApplicationReactionHandler.ts    # Reaction logic
        └── EvaluateApplicationReactionController.ts # HTTP endpoint
```

### Business Flow

1. **Submit Application**:
   - User sends `SubmitApplicationCommand`
   - Handler validates and creates `ApplicationSubmitted` event
   - Event stored in PostgreSQL

2. **Auto-Evaluation**:
   - Ambar streams `ApplicationSubmitted` to reaction
   - `EvaluateApplicationReactionHandler` applies business rules
   - Creates `ApplicationEvaluated` event

3. **Update Projections**:
   - Both events streamed to projection handlers
   - MongoDB collections updated with member data
   - Organized by cuisine for efficient querying

4. **Query Members**:
   - Users query members by cuisine
   - Handler reads from MongoDB projections
   - Returns optimized view

## Infrastructure & Development

### Local Development Environment

**Location**: `local-development/`

**Components**:

- **Docker Compose**: Orchestrates all services
- **PostgreSQL**: Event store with logical replication
- **MongoDB**: Projection store with replica set
- **Ambar Emulator**: Event streaming platform
- **Database Explorers**: Web UIs for data inspection

**Services**:

```yaml
services:
  event-sourcing-backend: # Main application (port 8080)
  event-sourcing-event-store: # PostgreSQL
  event-sourcing-projection-store: # MongoDB
  event-sourcing-event-bus: # Ambar emulator
  event-sourcing-event-explorer: # Postgres UI (port 8081)
  event-sourcing-projection-explorer: # MongoDB UI (port 8082)
```

### Ambar Configuration

**File**: `local-development/ambar-config.yaml`

**Purpose**: Configures event streaming from PostgreSQL to HTTP endpoints

**Key Concepts**:

- **Data Sources**: PostgreSQL event store
- **Data Destinations**: HTTP endpoints for projections and reactions
- **Ordering**: Events ordered by `correlation_id`
- **Authentication**: Basic auth for endpoints

### Development Scripts

**Platform Support**: Linux, macOS, Windows
**Tools**: Docker and Podman support

**Available Scripts**:

- `dev_start.sh`: Start/restart application
- `dev_start_with_data_deletion.sh`: Fresh start with clean databases
- `dev_shutdown.sh`: Stop all services
- `dev_demo.sh`: Run demonstration scenario

## Dependency Injection

### Container Configuration

**File**: `src/di/container.ts`

**Architecture**: Uses TSyringe for IoC container

**Registration Types**:

- **Singletons**: Shared across application lifetime
  - Database connection pools
  - Serializers/deserializers
  - Initializers

- **Scoped**: Per-request instances
  - Event stores
  - Repositories
  - Handlers
  - Controllers

### Scoped Container Middleware

**File**: `src/di/scopedContainer.ts`

**Purpose**: Creates request-scoped dependency injection context

**Benefits**:

- Transactional boundaries per request
- Proper resource cleanup
- Request isolation

## Event Serialization

### Serialization System

**Location**: `src/common/serializedEvent/`

**Purpose**: Convert between domain events and database format

**Key Components**:

- `Serializer`: Domain events → SerializedEvent
- `Deserializer`: SerializedEvent → Domain events
- `SerializedEvent`: Database representation

**Maintenance**: Must be updated when adding/removing event types

## API Endpoints

### Command Endpoints

- `POST /api/v1/cooking-club/membership/command/submit-application`

### Query Endpoints

- `GET /api/v1/cooking-club/membership/query/members-by-cuisine`

### Internal Endpoints (Ambar)

- `POST /api/v1/cooking-club/membership/projection/members-by-cuisine`
- `POST /api/v1/cooking-club/membership/reaction/evaluate-application`

### Health Endpoints

- `GET /` - Basic health check
- `GET /docker_healthcheck` - Docker health check

## Development Guidelines

### Adding New Features

1. **Define Domain Events**
   - Create event classes in `domain/*/event/`
   - Extend `CreationEvent` or `TransformationEvent`

2. **Update Serialization**
   - Add event mappings in `Serializer`/`Deserializer`

3. **Implement Aggregates**
   - Create/update aggregate classes
   - Handle event application

4. **Create Commands**
   - Define command classes
   - Implement command handlers
   - Create HTTP controllers

5. **Build Projections**
   - Create projection handlers
   - Define read models
   - Create repositories

6. **Add Queries**
   - Define query classes
   - Implement query handlers
   - Create HTTP controllers

7. **Register Services**
   - Update dependency injection in `container.ts`
   - Add routes in `index.ts`

8. **Configure Ambar**
   - Add destinations in `ambar-config.yaml`

### Best Practices

1. **Event Design**
   - Events should be immutable
   - Include all necessary data
   - Use descriptive names
   - Avoid breaking changes

2. **Aggregate Design**
   - Keep aggregates small and focused
   - Enforce business invariants
   - Use optimistic locking

3. **Command Handling**
   - Validate input thoroughly
   - Apply business rules consistently
   - Generate meaningful events

4. **Projection Design**
   - Make handlers idempotent
   - Handle event ordering carefully
   - Optimize for query patterns

5. **Error Handling**
   - Use proper HTTP status codes
   - Log errors appropriately
   - Handle failures gracefully

## Production Considerations

### Deployment

- Build Docker image from provided Dockerfile
- Use cloud-specific infrastructure templates
- Configure environment variables properly
- Set up monitoring and logging

### Scaling

- **Event Store**: PostgreSQL read replicas
- **Projections**: MongoDB sharding
- **Application**: Horizontal scaling with load balancer
- **Event Processing**: Multiple Ambar instances

### Monitoring

- Application metrics via logging
- Database performance monitoring
- Event processing latency
- Error rates and patterns

### Security

- Authentication via Ambar middleware
- Database connection security
- Input validation with Zod
- Error message sanitization

## Conclusion

This event-sourcing TypeScript starter pack provides a complete, production-ready foundation for building event-sourced applications. The cooking club membership example demonstrates all key patterns and can be replaced with your own domain logic while maintaining the same architectural benefits.

The separation of concerns, CQRS implementation, and comprehensive tooling make this an excellent starting point for any event-sourced system requiring high consistency, auditability, and scalability.

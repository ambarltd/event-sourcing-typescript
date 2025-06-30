# Command Handler

A Command Handler in an EventSourcing system is responsible for taking statements of intent (commands) from end users or other systems (both internal and external), performing validation, and upon valid conditions, adding new Events to the Event Store.

To do this, the Command Handler reads past events from the Event store to hydrate / reconstitute an Aggregate. Once the aggregate is hydrated, the Command Handler checks for any business rules or constraints (e.g., ensuring an order hasn't already been completed or that an account has sufficient balance).

If all validations succeed, the Command Handler generates a new Event reflecting the state change requested by the command. This Event is then written back to the Event store, allowing the system to evolve while maintaining a full history of all changes.

## Command Options Pattern

Commands in this system use an **Options Pattern** for better maintainability and type safety:

### Example Command Implementation

```typescript
export interface SubmitApplicationCommandOptions extends BaseCommandOptions {
  firstName: string;
  lastName: string;
  favoriteCuisine: string;
  yearsOfProfessionalExperience: number;
  numberOfCookingBooksRead: number;
}

export class SubmitApplicationCommand extends Command {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly favoriteCuisine: string;
  public readonly yearsOfProfessionalExperience: number;
  public readonly numberOfCookingBooksRead: number;

  constructor(options: SubmitApplicationCommandOptions) {
    super(options);

    this.firstName = options.firstName;
    this.lastName = options.lastName;
    this.favoriteCuisine = options.favoriteCuisine;
    this.yearsOfProfessionalExperience = options.yearsOfProfessionalExperience;
    this.numberOfCookingBooksRead = options.numberOfCookingBooksRead;
  }
}
```

### Benefits of Options Pattern

1. **Self-documenting**: Interface clearly shows required properties
2. **IntelliSense support**: IDEs provide autocomplete for command properties
3. **Type safety**: Compile-time checking for missing or incorrect properties
4. **Refactoring safety**: IDE support for renaming properties
5. **Extensible**: Easy to add optional properties without breaking existing code
6. **Consistent**: Matches the pattern used by Events in this system

### Usage

```typescript
// Create command with options object
const commandOptions: SubmitApplicationCommandOptions = {
  firstName: 'John',
  lastName: 'Doe',
  favoriteCuisine: 'Italian',
  yearsOfProfessionalExperience: 5,
  numberOfCookingBooksRead: 12,
};

const command = new SubmitApplicationCommand(commandOptions);
```

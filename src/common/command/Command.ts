export type CommandProps<T> = T;

export abstract class Command {
  constructor(props: CommandProps<unknown>) {
    Object.assign(this, props);
  }
}

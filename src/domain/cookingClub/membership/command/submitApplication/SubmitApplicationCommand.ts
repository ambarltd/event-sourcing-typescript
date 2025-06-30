import { Command, CommandProps } from '../../../../../common';

export interface SubmitApplicationCommandProps {
  readonly firstName: string;
  readonly lastName: string;
  readonly favoriteCuisine: string;
  readonly yearsOfProfessionalExperience: number;
  readonly numberOfCookingBooksRead: number;
}

export class SubmitApplicationCommand extends Command {
  public readonly firstName!: string;
  public readonly lastName!: string;
  public readonly favoriteCuisine!: string;
  public readonly yearsOfProfessionalExperience!: number;
  public readonly numberOfCookingBooksRead!: number;

  constructor(props: CommandProps<SubmitApplicationCommandProps>) {
    super(props);
  }
}

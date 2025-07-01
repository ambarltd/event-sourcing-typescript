import { Command } from '../../../../../common';

export class SubmitApplicationCommand extends Command {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly favoriteCuisine: string,
    public readonly yearsOfProfessionalExperience: number,
    public readonly numberOfCookingBooksRead: number,
  ) {
    super();
  }
}

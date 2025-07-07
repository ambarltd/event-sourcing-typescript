import { IsNumber, IsString } from 'class-validator';
import { Command } from '../../../../../common';

export class SubmitApplicationCommand extends Command {
  @IsString()
  public readonly firstName: string;

  @IsString()
  public readonly lastName: string;

  @IsString()
  public readonly favoriteCuisine: string;

  @IsNumber()
  public readonly yearsOfProfessionalExperience: number;

  @IsNumber()
  public readonly numberOfCookingBooksRead: number;

  constructor(
    firstName: string,
    lastName: string,
    favoriteCuisine: string,
    yearsOfProfessionalExperience: number,
    numberOfCookingBooksRead: number,
  ) {
    super();
    this.firstName = firstName;
    this.lastName = lastName;
    this.favoriteCuisine = favoriteCuisine;
    this.yearsOfProfessionalExperience = yearsOfProfessionalExperience;
    this.numberOfCookingBooksRead = numberOfCookingBooksRead;
  }
}

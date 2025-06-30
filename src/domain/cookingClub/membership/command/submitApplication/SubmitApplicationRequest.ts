import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SubmitApplicationRequest {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, {
    message: 'First name must be between 1 and 100 characters',
  })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Last name must be between 1 and 100 characters' })
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, {
    message: 'Favorite cuisine must be between 1 and 100 characters',
  })
  favoriteCuisine!: string;

  @IsNumber(
    {},
    { message: 'Years of professional experience must be a number' },
  )
  @Min(0, { message: 'Years of professional experience cannot be negative' })
  @Max(100, { message: 'Please enter a valid number of years (max 100)' })
  yearsOfProfessionalExperience!: number;

  @IsNumber({}, { message: 'Number of cooking books read must be a number' })
  @Min(0, { message: 'Number of cooking books read cannot be negative' })
  numberOfCookingBooksRead!: number;
}

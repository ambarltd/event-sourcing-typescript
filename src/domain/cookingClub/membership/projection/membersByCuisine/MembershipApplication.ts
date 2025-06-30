export class MembershipApplication {
  constructor(
    public readonly _id: string, // needs to be _id to be recognized as an _id field by MongoDB
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly favoriteCuisine: string,
  ) {}
}

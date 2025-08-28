import { ProjectionHandler } from '@/common';
import { inject, injectable } from 'tsyringe';
import { CuisineRepository } from '@/domain/cookingClub/membership/projection/membersByCuisine/CuisineRepository';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership/event/ApplicationSubmitted';
import { MembershipApplicationRepository } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembershipApplicationRepository';
import { MembershipApplication } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembershipApplication';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership/event/ApplicationEvaluated';
import { MembershipStatus } from '@/domain/cookingClub/membership/aggregate/membership';
import { Cuisine } from '@/domain/cookingClub/membership/projection/membersByCuisine/Cuisine';

@injectable()
export class MembersByCuisineProjectionHandler extends ProjectionHandler {
  constructor(
    @inject(CuisineRepository)
    private readonly cuisineRepository: CuisineRepository,
    @inject(MembershipApplicationRepository)
    private readonly membershipApplicationRepository: MembershipApplicationRepository,
  ) {
    super();
  }

  async project(event: any): Promise<void> {
    if (event instanceof ApplicationSubmitted) {
      await this.membershipApplicationRepository.save(
        new MembershipApplication(
          event.aggregateId,
          event.firstName,
          event.lastName,
          event.favoriteCuisine,
        ),
      );
    }
    if (
      event instanceof ApplicationEvaluated &&
      event.evaluationOutcome === MembershipStatus.Approved
    ) {
      const membershipApplication =
        await this.membershipApplicationRepository.findOneById(
          event.aggregateId,
        );

      if (!membershipApplication)
        throw new Error('Membership application not found');

      let cuisine = await this.cuisineRepository.findOneById(
        membershipApplication.favoriteCuisine,
      );

      if (!cuisine) {
        cuisine = new Cuisine(membershipApplication.favoriteCuisine, []);
      }

      cuisine.memberNames.push(
        `${membershipApplication.firstName} ${membershipApplication.lastName}`,
      );

      await this.cuisineRepository.save(cuisine);
    }
  }
}

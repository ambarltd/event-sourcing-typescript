import { ProjectionHandler } from '../../../../../common';
import { inject, injectable } from 'tsyringe';
import { CuisineRepository } from './CuisineRepository';
import { ApplicationSubmitted } from '../../event/ApplicationSubmitted';
import { MembershipApplicationRepository } from './MembershipApplicationRepository';
import { MembershipApplication } from './MembershipApplication';
import { ApplicationEvaluated } from '../../event/ApplicationEvaluated';
import { MembershipStatus } from '../../aggregate/membership';
import { Cuisine } from './Cuisine';

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

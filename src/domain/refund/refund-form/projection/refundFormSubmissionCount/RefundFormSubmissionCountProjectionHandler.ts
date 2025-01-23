import {ProjectionHandler} from '../../../../../common/projection/ProjectionHandler';
import {inject, injectable} from "tsyringe";
import {RefundFormSubmissionCountRepository} from "./RefundFormSubmissionCountRepository";
import {RefundFormSubmitted} from "../../event/RefundFormSubmitted";
import { Count } from "./Count";

@injectable()
export class RefundFormSubmissionCountProjectionHandler extends ProjectionHandler {
    constructor(
        @inject(RefundFormSubmissionCountRepository) private readonly refundFormSubmissionCountRepository: RefundFormSubmissionCountRepository,
    ) {
        super();
    }

    async project(event: any): Promise<void> {
        if (!(event instanceof RefundFormSubmitted)) {
            return;
        }

        let count = await this.refundFormSubmissionCountRepository.findOneById("total");

        if (!count) {
            count = new Count("total", 0);
        }

        await this.refundFormSubmissionCountRepository.save(new Count("total", count.count + 1));
    }
}
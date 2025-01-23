import { Command } from '../../../../../common/command/Command';

export class SubmitRefundFormCommand extends Command {
    constructor(
        public readonly orderId: string,
        public readonly email: string,
        public readonly comments: string
    ) {
        super();
    }
}

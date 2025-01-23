export class Count {
    constructor(
        public readonly _id: string,  // needs to be _id to be recognized as an _id field by MongoDB
        public readonly count: number,
    ) {}
}
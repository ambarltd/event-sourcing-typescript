import { PreconditionFailedError } from '../../errors';
import {
  convertPropsToFlatObject,
  convertPropsToObject,
  Guard,
} from '../utils';

export type AggregateID = string;

export interface BaseEntityProps {
  id: AggregateID;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEntityProps<T> {
  id: AggregateID;
  props: T;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum MatchEventStatEnum {
  Playing = 'playing',
}

export abstract class Entity<EntityProps, EntityRawProps> {
  /**
   * ID is set in the concrete entity implementation to support
   * different ID types depending on your needs.
   * For example it could be a UUID for aggregate root,
   * and shortid / nanoid for child entities.
   */
  protected abstract _id: AggregateID;

  private readonly _createdAt: Date;

  private readonly _updatedAt: Date;

  protected readonly props: EntityProps;

  constructor({
    id,
    createdAt,
    updatedAt,
    props,
  }: CreateEntityProps<EntityProps>) {
    this.setId(id);
    this.validateProps(props);

    const now = new Date();
    this._createdAt = createdAt || now;
    this._updatedAt = updatedAt || now;
    this.props = props;
    this.validate();
  }

  get id(): AggregateID {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static isEntity(entity: unknown): entity is Entity<unknown, unknown> {
    return entity instanceof Entity;
  }

  private setId(id: AggregateID): void {
    this._id = id;
  }

  /**
   *  Checks if two entities are the same Entity by comparing ID field.
   * @param object Entity
   */
  equals(object?: Entity<EntityProps, EntityRawProps>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!Entity.isEntity(object)) {
      return false;
    }

    return this.id ? this.id === object.id : false;
  }

  /**
   * Returns entity properties.
   * @return {*}  {Props & EntityProps}
   * @memberof Entity
   */
  getProps(): EntityProps & BaseEntityProps {
    const propsCopy = {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...this.props,
    };

    return Object.freeze(propsCopy);
  }

  /**
   * Convert an Entity and all sub-entities/Value Objects it
   * contains to a plain object with primitive types. Can be
   * useful when logging an entity during testing/debugging
   */
  toObject(): CreateEntityProps<EntityRawProps> {
    const plainProps = convertPropsToObject(this.props) as EntityRawProps;

    const result = {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      props: { ...plainProps },
    };

    return Object.freeze(result);
  }

  toFlatObject(): EntityRawProps & BaseEntityProps {
    const plainProps = convertPropsToFlatObject(this.props) as EntityRawProps;
    const result = {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...plainProps,
    };

    return Object.freeze(result);
  }

  /**
   * There are certain rules that always have to be true (invariants)
   * for each entity. Validate method is called every time before
   * saving an entity to the database to make sure those rules are respected.
   */
  abstract validate(): void;

  private validateProps(props: EntityProps): void {
    const MAX_PROPS = 50;

    if (Guard.isEmpty(props)) {
      throw new PreconditionFailedError('Entity props should not be empty');
    }

    if (typeof props !== 'object') {
      throw new PreconditionFailedError('Entity props should be an object');
    }

    if (Object.keys(props).length > MAX_PROPS) {
      throw new PreconditionFailedError(
        `Entity props should not have more than ${MAX_PROPS} properties`
      );
    }
  }
}

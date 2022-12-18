import { v4 } from 'uuid';
import * as Utils from './Utils';

export default class Generic {
  private cache: { [key: string]: { [key: string]: any } } = {};

  public static TYPES = {
    GenericObject: 'GenericObject',
    GenericValue: 'GenericValue',
  };

  returnCached(object, type = Generic.TYPES.GenericObject, represents = object.constructor.name, id = v4()) {
    this.addToCache(type, id, object);

    return {
      id,
      type,
      represents,
    };
  }

  addToCache<T>(type, id, item: T): T {
    if (!(type in this.cache)) {
      this.cache[type] = {};
    }
    this.cache[type][id] = item;
    return item;
  }

  getCache(): { [key: string]: { [key: string]: any } };
  getCache(key: string): { [key: string]: any };
  getCache(key?: string) {
    return key ? this.cache[key] : this.cache;
  }

  getKey(object, type = Generic.TYPES.GenericObject) {
    let cache = this.getCache(type);
    for (let id in cache) {
      if (cache[id] === object) {
        return {
          id,
          type,
          represents: Utils.resolveConstructorName(object),
        };
      }
    }
  }
}

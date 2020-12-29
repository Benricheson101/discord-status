/**
 * Class representing a first-in first-out queue of indefinite length
 */
export class Queue<T> extends Array<T> {
  constructor() {
    super();
  }

  /**
   * Add an item to the queue
   * @param item The item to enqueue
   */
  enqueue(item: T) {
    return this.push(item);
  }

  /** Remove the item at the beginning of the queue and return it */
  dequeue(): T | undefined {
    return this.shift();
  }

  /** Get the item at the beginning of the queue without removing it */
  peek(): T | undefined {
    return this[0];
  }

  /** Turn the queue into an array */
  toArray(): Array<T> {
    return [...this];
  }
}

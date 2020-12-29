/**
 * Class representing a first-in first-out queue
 */
export class Queue<T> extends Array<T> {
  constructor(private maxLength: number) {
    super();
  }

  /**
   * Add to the queue. If the new length exceeds the max length,
   * old items are removed.
   * @param args Args to add to the queue
   * @return New queue length
   */
  push(...args: T[]): number {
    for (const arg of args) {
      if (this.length >= this.maxLength) {
        this.shift();
      }

      super.push(arg);
    }

    return this.length;
  }

  /**
   * Add an item to the queue
   * @param item The item to enqueue
   */
  enqueue(item: T) {
    return this.push(item);
  }

  /** Remove the item at the beginning of the queue */
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

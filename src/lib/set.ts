export class SetWithContentEquality<T> {
    private items: T[] = [];
    private getKey: (item: T) => string;

    public constructor(getKey: (item: T) => string) {
        this.getKey = getKey;
    }

    public add(item: T): void {
        const key = this.getKey(item);
        if (!this.items.some(existing => this.getKey(existing) === key)) {
            this.items.push(item);
        }
    }

    public has(item: T): boolean {
        return this.items.some(existing => this.getKey(existing) === this.getKey(item));
    }

    public values(): T[] {
        return [...this.items];
    }
}
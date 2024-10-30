export class ExpiringCache<K, V> {
    #timeout: number;
    #cache: Map<K, { value: V; timestamp: number }>;
    constructor(timeout: number) {
        this.#timeout = timeout;
        this.#cache = new Map();
    }
    get(key: K) {
        const now = Date.now();
        const value = this.#cache.get(key);
        if (!value) return;
        if (now - value.timestamp > this.#timeout) return;
        return value.value;
    }
    set(key: K, value: V) {
        const now = Date.now();
        this.#cache.set(key, { value, timestamp: now });
        return this;
    }
    delete(key: K) {
        return this.#cache.delete(key);
    }
    async getOrFetch(key: K, fetcher: () => Promise<V>) {
        const value1 = this.get(key);
        if (value1 !== undefined) return value1;
        const value2 = await fetcher();
        this.set(key, value2);
        return value2;
    }
}

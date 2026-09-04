type OwnedRegistryEntry<T> = {
	ownerId: string;
	value: T;
};

type OwnedRegistryOptions<T> = {
	kind: string;
	onRemove?: (value: T) => void;
};

export class OwnedRegistry<T> {
	private readonly entries = new Map<string, OwnedRegistryEntry<T>>();
	private readonly kind: string;
	private readonly onRemove: ((value: T) => void) | undefined;

	public constructor(options: OwnedRegistryOptions<T>) {
		this.kind = options.kind;
		this.onRemove = options.onRemove;
	}

	public register(ownerId: string, key: string, value: T): void {
		const normalizedKey = key.trim();
		if (!normalizedKey) {
			throw new Error(`Cannot register ${this.kind} with an empty key.`);
		}

		const existing = this.entries.get(normalizedKey);
		if (existing && existing.ownerId !== ownerId) {
			throw new Error(`Cannot register ${this.kind} "${normalizedKey}" for plugin "${ownerId}"; it is already owned by "${existing.ownerId}".`);
		}

		if (existing && this.onRemove) {
			this.onRemove(existing.value);
		}

		this.entries.set(normalizedKey, { ownerId, value });
	}

	public get(key: string): T | undefined {
		return this.entries.get(key)?.value;
	}

	public getAll(): T[] {
		return Array.from(this.entries.values(), entry => entry.value);
	}

	public getKeysByOwner(ownerId: string): string[] {
		return Array.from(this.entries.entries()).filter(([, entry]) => entry.ownerId === ownerId).map(([key]) => key);
	}

	public unregisterOwner(ownerId: string): void {
		for (const [key, entry] of this.entries.entries()) {
			if (entry.ownerId === ownerId) {
				if (this.onRemove) {
					this.onRemove(entry.value);
				}
				this.entries.delete(key);
			}
		}
	}
}
